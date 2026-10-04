"use client";

import { useState } from "react";
import { TREND_RANGES } from "@/lib/mock-data";

type Range = keyof typeof TREND_RANGES;
const RANGES: Range[] = ["1W", "1M", "1Y"];

/**
 * The Inventory Trend chart, with its 1W / 1M / 1Y toggle
 */
export default function LineChart() {
  const [range, setRange] = useState<Range>("1W");
  const { labels, values } = TREND_RANGES[range];

  const width = 640;
  const height = 220;
  const padding = { top: 10, right: 8, bottom: 4, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const max = Math.max(...values);
  const stepX = chartW / (values.length - 1);

  const points = values.map((v, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - (v / max) * chartH,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink">Inventory Trend</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`h-[30px] rounded-[15px] px-[13px] text-[12.5px] font-bold ${
                range === r ? "bg-brand text-white" : "bg-transparent text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-[18px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Inventory trend">
          <path d={areaPath} fill="#0B4C8C" opacity={0.08} />
          <path d={linePath} fill="none" stroke="#0B4C8C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="white" stroke="#0B4C8C" strokeWidth={2.5} />
          ))}
        </svg>
      </div>

      <div className="flex justify-between px-1 pt-2 font-mono text-[11px] tracking-[.1em] text-[#5B6472]">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
