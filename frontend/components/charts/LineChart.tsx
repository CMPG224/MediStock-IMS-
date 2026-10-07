"use client";

import { useState } from "react";
import { fetchTrend, type TrendRange } from "@/lib/data/dashboard";
import { useAsync } from "@/lib/useAsync";

type Range = TrendRange;
const RANGES: Range[] = ["1W", "1M", "1Y"];
const BRAND = "#0B4C8C";

/** Inventory Trend chart (plain SVG) with a 1W / 1M / 1Y toggle. */
export default function LineChart() {
  const [range, setRange] = useState<Range>("1W");
  const { data, error } = useAsync(() => fetchTrend(range), [range]);
  const labels = data?.labels ?? [];
  // A single point can't draw a line, so it's repeated flat.
  const values = data?.values.length === 1 ? [data.values[0], data.values[0]] : (data?.values ?? []);

  const width = 640;
  const height = 220;
  const padding = { top: 12, right: 10, bottom: 4, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  // Scaled to the visible range so day-to-day changes in large totals show.
  const hi = Math.max(...values, 1);
  const lo = Math.min(...values) * 0.9;
  const stepX = chartW / Math.max(values.length - 1, 1);

  const points = values.map((v, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - ((v - lo) / (hi - lo || 1)) * chartH,
  }));
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points[points.length - 1] ?? first;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${last.x} ${padding.top + chartH} L ${first.x} ${padding.top + chartH} Z`;
  const guides = [0.25, 0.5, 0.75].map((f) => padding.top + chartH * f);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[18px] font-bold text-ink">Inventory Trend</h2>
        <div role="group" aria-label="Time range" className="flex rounded-full border border-border-soft bg-page p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`h-7 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
                range === r ? "bg-white text-brand shadow-[0_1px_3px_rgba(16,35,64,.12)]" : "text-muted hover:text-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {values.length === 0 ? (
          <p className="flex items-center justify-center text-center text-[13px] text-muted" style={{ height }}>
            {error ?? (data ? "No inventory snapshots for this range yet." : "Loading…")}
          </p>
        ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} role="img" aria-label={`Inventory trend, ${range}`}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.14} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          {guides.map((y) => (
            <line key={y} x1={0} x2={width} y1={y} y2={y} stroke="#E7ECF3" strokeDasharray="3 5" />
          ))}
          <line x1={0} x2={width} y1={padding.top + chartH} y2={padding.top + chartH} stroke="#DCE3EC" />
          <path d={areaPath} fill="url(#trend-fill)" />
          <path d={linePath} fill="none" stroke={BRAND} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={last.x} cy={last.y} r={8} fill={BRAND} opacity={0.12} />
          <circle cx={last.x} cy={last.y} r={4} fill="white" stroke={BRAND} strokeWidth={2.25} />
        </svg>
        )}
      </div>

      <div className="flex justify-between px-1 pt-2.5 text-[11.5px] font-medium text-muted">
        {labels.map((label, i) => (
          <span key={`${label}-${i}`} className={i === labels.length - 1 ? "font-semibold text-ink" : undefined}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
