"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { BTN_SMALL_OUTLINE, CARD, TD, TH } from "@/components/ui/buttons";
import { extractInvoice, type ExtractedInvoice } from "@/lib/ai/client";
import { fetchMedicineOptions, recordTransaction, type MedicineOption } from "@/lib/data/transactions";
import { formatRand } from "@/lib/format";
import { extractPdfText } from "@/lib/pdf/extract";
import { errorMessage } from "@/lib/useAsync";

const MAX_BYTES = 10 * 1024 * 1024;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type Row = ExtractedInvoice["items"][number] & { match?: MedicineOption; apply: boolean };

export default function InvoicePanel() {
  const [stage, setStage] = useState<"idle" | "reading" | "review" | "saving" | "done">("idle");
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<ExtractedInvoice | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [applied, setApplied] = useState(0);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("Choose a PDF file.");
    if (file.size > MAX_BYTES) return setError("That PDF is larger than 10 MB.");
    setStage("reading");
    try {
      const text = (await extractPdfText(file)).join("\n\n");
      if (text.trim().length < 20) throw new Error("No text found. Scanned PDFs without a text layer are not supported.");
      const [inv, meds] = await Promise.all([extractInvoice(text), fetchMedicineOptions()]);
      setInvoice(inv);
      setRows(
        inv.items.map((i) => {
          const match = meds.find((m) => norm(m.name) === norm(i.name));
          return { ...i, match, apply: !!match };
        }),
      );
      setStage("review");
    } catch (e) {
      setError(errorMessage(e));
      setStage("idle");
    }
  }

  async function apply() {
    const chosen = rows.filter((r) => r.apply && r.match);
    if (!chosen.length || !invoice) return;
    setStage("saving");
    setError("");
    let done = 0;
    try {
      for (const r of chosen) {
        await recordTransaction({
          medicineId: r.match!.id,
          type: "in",
          quantity: r.quantity,
          batch: invoice.reference,
          note: `Imported from invoice${invoice.supplier ? ` (${invoice.supplier})` : ""}.`,
        });
        done++;
      }
      setApplied(done);
      setStage("done");
    } catch (e) {
      // Earlier lines are already booked; say so rather than hide a partial import.
      setError(`${errorMessage(e)}${done ? ` ${done} line(s) were already recorded.` : ""}`);
      setRows((rs) => rs.map((r, i) => (i < done ? { ...r, apply: false } : r)));
      setStage("review");
    }
  }

  const reset = () => {
    setStage("idle");
    setInvoice(null);
    setRows([]);
    setError("");
  };

  return (
    <section className={`${CARD} flex flex-col gap-5 p-6`} aria-label="Invoice import">
      {(stage === "idle" || stage === "reading") && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-12 text-center hover:bg-page">
          <Icon name="upload_file" size={32} className="text-brand" />
          <span className="text-[15px] font-semibold text-ink">{stage === "reading" ? "Reading document…" : "Upload a supplier invoice or delivery note (PDF)"}</span>
          <span className="text-[13px] text-muted">Line items are matched to your medicines. You review everything before stock is recorded.</span>
          <input type="file" accept="application/pdf" className="sr-only" disabled={stage === "reading"} onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
      )}

      {error && <p role="alert" className="text-[13px] font-medium text-danger">{error}</p>}

      {(stage === "review" || stage === "saving") && invoice && (
        <>
          <div>
            <h2 className="text-[18px] font-bold text-ink">{invoice.supplier || "Unknown supplier"}</h2>
            <p className="text-[13px] text-muted">Reference: {invoice.reference || "—"}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
              <thead className="bg-[#F3F6FB]">
                <tr>
                  <th className={TH}>Record</th>
                  <th className={TH}>Item on invoice</th>
                  <th className={`${TH} text-right`}>Qty</th>
                  <th className={`${TH} text-right`}>Unit cost</th>
                  <th className={TH}>Matched medicine</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border-soft">
                    <td className={TD}>
                      <input
                        type="checkbox"
                        checked={r.apply}
                        disabled={!r.match}
                        aria-label={`Record ${r.name}`}
                        onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, apply: e.target.checked } : x)))}
                        className="h-4 w-4 accent-brand"
                      />
                    </td>
                    <td className={`${TD} font-medium text-ink`}>{r.name}</td>
                    <td className={`${TD} text-right`}>{r.quantity}</td>
                    <td className={`${TD} text-right`}>{formatRand(r.unitCost)}</td>
                    <td className={TD}>{r.match ? r.match.name : <span className="text-muted">No match — add it on the Medicine page first</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <button type="button" className={BTN_SMALL_OUTLINE} onClick={reset}>Cancel</button>
            <button
              type="button"
              onClick={apply}
              disabled={stage === "saving" || !rows.some((r) => r.apply)}
              className="h-9 rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {stage === "saving" ? "Recording…" : "Record stock in"}
            </button>
          </div>
        </>
      )}

      {stage === "done" && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[14px] text-ink">Recorded stock in for {applied} item{applied === 1 ? "" : "s"}. See them under Transactions.</p>
          <button type="button" className={BTN_SMALL_OUTLINE} onClick={reset}>Import another</button>
        </div>
      )}
    </section>
  );
}
