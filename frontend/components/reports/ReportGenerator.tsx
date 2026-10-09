"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { BTN_PRIMARY, BTN_SMALL_OUTLINE, CARD, TD, TH } from "@/components/ui/buttons";
import {
  generateExpiryForecast,
  generateLowStock,
  generateStockSummary,
  generateValuation,
  type ReportKind,
  type ReportResult,
} from "@/lib/data/reports";
import { isoDay } from "@/lib/format";
import { buildTableReportPdf, downloadBlob } from "@/lib/pdf/generate";
import { errorMessage } from "@/lib/useAsync";

const KINDS: { value: ReportKind; label: string }[] = [
  { value: "stock-summary", label: "Stock Summary" },
  { value: "expiry-forecast", label: "Expiry Forecast" },
  { value: "low-stock-report", label: "Low Stock Report" },
  { value: "inventory-valuation", label: "Inventory Valuation" },
];

const FIELD =
  "h-10 rounded-[9px] border border-border bg-white px-3 text-[14px] text-ink focus:border-brand focus:outline-none aria-[invalid=true]:border-danger";
const LABEL = "text-[12px] font-semibold text-muted";

const kindFromHash = (): ReportKind | null => {
  const h = window.location.hash.slice(1);
  return KINDS.some((k) => k.value === h) ? (h as ReportKind) : null;
};

export default function ReportGenerator() {
  const today = isoDay(new Date());
  const monthStart = `${today.slice(0, 8)}01`;
  const [kind, setKind] = useState<ReportKind>("stock-summary");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [days, setDays] = useState("30");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);

  // The "Available Reports" cards link to #<slug>; follow them.
  useEffect(() => {
    const sync = () => {
      const k = kindFromHash();
      if (k) {
        setKind(k);
        setResult(null);
        setError("");
        document.getElementById("generate")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (kind === "stock-summary") {
      if (!from || !to) return setError("Choose both a start and an end date.");
      if (to < from) return setError("The end date must be after the start date.");
    }
    setBusy(true);
    setResult(null);
    try {
      setResult(
        kind === "stock-summary"
          ? await generateStockSummary(from, to)
          : kind === "expiry-forecast"
            ? await generateExpiryForecast(Number(days))
            : kind === "low-stock-report"
              ? await generateLowStock()
              : await generateValuation(),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    if (!result?.rows.length) return;
    downloadBlob(await buildTableReportPdf(result), `${result.title.toLowerCase().replace(/\s+/g, "-")}-${today}.pdf`);
  }

  return (
    <section id="generate" aria-labelledby="generate-title" className={`${CARD} flex flex-col gap-5 p-6`}>
      <h2 id="generate-title" className="text-[22px] font-bold text-ink">Generate a Report</h2>

      <form onSubmit={generate} noValidate className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rg-kind" className={LABEL}>Report</label>
          <select
            id="rg-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ReportKind);
              setResult(null);
              setError("");
            }}
            className={FIELD}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>

        {kind === "stock-summary" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rg-from" className={LABEL}>From</label>
              <input id="rg-from" type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className={FIELD} aria-invalid={!!error} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rg-to" className={LABEL}>To</label>
              <input id="rg-to" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className={FIELD} aria-invalid={!!error} />
            </div>
          </>
        )}
        {kind === "expiry-forecast" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rg-days" className={LABEL}>Expiring within</label>
            <select id="rg-days" value={days} onChange={(e) => setDays(e.target.value)} className={FIELD}>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        )}

        <button type="submit" disabled={busy} className={`${BTN_PRIMARY} !h-10 !px-5 !text-[13.5px]`}>
          <Icon name="bar_chart" size={16} /> {busy ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && <p role="alert" className="text-[13.5px] font-medium text-danger">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-bold text-ink">{result.title}</h3>
              <p className="text-[13px] text-muted">{result.subtitle}</p>
            </div>
            {result.rows.length > 0 && (
              <button type="button" onClick={exportPdf} className={BTN_SMALL_OUTLINE}>
                <Icon name="download" size={15} /> Export PDF
              </button>
            )}
          </div>
          {result.rows.length === 0 ? (
            <p className="rounded-[10px] border border-border-soft px-4 py-8 text-center text-[14px] text-muted">No records found.</p>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-border-soft">
              <table className="w-full min-w-[480px] border-collapse text-left text-[13.5px]">
                <thead className="bg-[#F1F4F9]">
                  <tr>
                    {result.head.map((h, i) => (
                      <th key={h} scope="col" className={`${TH} ${result.numeric.includes(i) ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border-soft">
                      {r.map((c, j) => (
                        <td key={j} className={`${TD} ${j === 0 ? "font-medium text-ink" : "text-body"} ${result.numeric.includes(j) ? "text-right tabular-nums" : ""}`}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
