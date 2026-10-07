"use client";

import { fetchStockMovement } from "@/lib/data/dashboard";
import { useAsync } from "@/lib/useAsync";

/** Completed units moved (in + out) per month; heights are % of the busiest month. */
export default function StockMovementChart() {
  const { data, error } = useAsync(fetchStockMovement, []);
  const months = data ?? [];
  const totals = months.map((m) => m.stockIn + m.stockOut);
  const peak = Math.max(...totals, 1);
  const lastIndex = months.length - 1;
  const cols = { gridTemplateColumns: `repeat(${Math.max(months.length, 1)}, minmax(0, 1fr))` };

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-5 text-[18px] font-bold text-ink">Stock Movement</h2>
      {months.length === 0 ? (
        <p className="flex min-h-[230px] flex-1 items-center justify-center text-[13px] text-muted">
          {error ?? (data ? "No stock movement recorded yet." : "Loading…")}
        </p>
      ) : (
        <>
          <div className="grid min-h-[230px] flex-1 items-end gap-3 border-b border-border" style={cols}>
            {months.map((m, i) => (
              <div
                key={m.label + i}
                title={`${m.label}: ${m.stockIn} in, ${m.stockOut} out`}
                className={`rounded-t-[6px] transition-colors ${i === lastIndex ? "bg-brand" : "bg-[#C7D6E8] hover:bg-[#A9C0DB]"}`}
                style={{ height: `${(totals[i] / peak) * 100}%` }}
              />
            ))}
          </div>
          <div className="grid gap-3 pt-2.5 text-center text-[12.5px] text-muted" style={cols}>
            {months.map((m, i) => (
              <span key={m.label + i} className={i === lastIndex ? "font-semibold text-ink" : undefined}>
                {m.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
