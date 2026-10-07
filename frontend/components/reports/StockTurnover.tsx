"use client";

import { CARD } from "@/components/ui/buttons";
import { fetchStockTurnover } from "@/lib/data/reports";
import { useAsync } from "@/lib/useAsync";

const W = 400;
const H = 150;

export default function StockTurnover() {
  const { data, error } = useAsync(fetchStockTurnover, []);
  const values = data?.values ?? [];
  const labels = data?.labels ?? [];

  if (values.length < 2) {
    return (
      <section className={`${CARD} flex flex-col p-6`}>
        <h2 className="text-[18px] font-bold text-ink">Stock Turnover Ratio</h2>
        <p className="flex flex-1 items-center justify-center py-12 text-center text-[13px] text-muted">
          {error ?? (data ? "Not enough stock history yet." : "Loading…")}
        </p>
      </section>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({ x: 4 + (i * (W - 8)) / (values.length - 1), y: H - 8 - ((v - min) / span) * (H - 16) }));
  const latest = values.length - 1;
  const best = values.indexOf(max);
  // The bubble sits above the latest point, as % of the container.
  const left = Math.min(Math.max((pts[latest].x / W) * 100, 20), 75);

  return (
    <section className={`${CARD} flex flex-col p-6`}>
      <h2 className="text-[18px] font-bold text-ink">Stock Turnover Ratio</h2>
      <div className="relative mt-4 flex flex-1 flex-col justify-end pt-16">
        <div
          className="absolute top-0 -translate-x-1/2 rounded-lg border border-[#D6DEF3] bg-brand-tint px-3 py-2 text-[#3730A3]"
          style={{ left: `${left}%` }}
        >
          <div className="text-[13.5px] font-medium text-[#4338CA]">Latest ({labels[latest]})</div>
          <div className="text-[15px] font-semibold text-[#4338CA]">
            {values[latest].toFixed(2)}x <span className="text-[11px] font-normal">/ mo</span>
          </div>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Stock turnover ratio from ${labels[0]} to ${labels[latest]}, from ${values[0]}x to ${values[latest]}x per month.`}
        >
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#4338CA"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {[...new Set([best, latest])].map((i) => (
            <circle key={i} cx={pts[i].x} cy={pts[i].y} r={3.5} fill="#4338CA" />
          ))}
        </svg>
      </div>
    </section>
  );
}
