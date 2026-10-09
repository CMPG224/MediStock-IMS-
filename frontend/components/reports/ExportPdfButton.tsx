"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { BTN_PRIMARY } from "@/components/ui/buttons";
import { fetchInventoryValue, fetchMonthlyExpenditure, fetchStockTurnover, fetchSupplierPerformance } from "@/lib/data/reports";
import { summariseReport } from "@/lib/ai/client";
import { buildReportPdf, downloadBlob } from "@/lib/pdf/generate";
import { errorMessage } from "@/lib/useAsync";

export default function ExportPdfButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function exportPdf() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const [expenditure, inventory, suppliers, turnover] = await Promise.all([
        fetchMonthlyExpenditure(),
        fetchInventoryValue(),
        fetchSupplierPerformance(),
        fetchStockTurnover(),
      ]);
      const data = { expenditure: expenditure.current, inventory, suppliers, turnover };
      // The summary is a bonus: a missing key or slow model must not block the export.
      const summary = await Promise.race([
        summariseReport(JSON.stringify(data)),
        new Promise<undefined>((resolve) => setTimeout(resolve, 20000)),
      ]).catch(() => undefined);
      const blob = await buildReportPdf({ ...data, summary });
      downloadBlob(blob, `medistock-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={BTN_PRIMARY} onClick={exportPdf} disabled={busy} aria-busy={busy}>
        <Icon name="download" size={17} />
        {busy ? "Preparing…" : "Export PDF"}
      </button>
      {error && <span role="alert" className="text-[13px] font-medium text-danger">{error}</span>}
    </>
  );
}
