"use client";

import { useState } from "react";
import { CARD } from "@/components/ui/buttons";
import { formatRandCompact } from "@/lib/format";
import { fetchMonthlyExpenditure, type Period } from "@/lib/data/reports";
import { useAsync } from "@/lib/useAsync";

const W = 640;
const H = 240;
const PAD = { top: 16, bottom: 24 };

/** Catmull-Rom -> cubic bezier so the line is smooth. */
function smoothPath(pts: { x: number; y: number }[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "current", label: "Last 6 Months" },
  { key: "previous", label: "Previous 6" },
];

export default function MonthlyExpenditure() {
  const [period, setPeriod] = useState<Period>("current");
  const { data, error } = useAsync(fetchMonthlyExpenditure, []);
  const MONTH_LABELS = data?.[period].labels ?? [];
  const values = data?.[period].values ?? [];
  const max = Math.max(...values, 1) * 1.15;
  const baseY = H - PAD.bottom;
  const chartH = baseY - PAD.top;
  const step = W / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => ({ x: i * step, y: PAD.top + chartH - (v / max) * chartH }));
  const line = pts.length ? smoothPath(pts) : "";
  const area = `${line} L ${W} ${baseY} L 0 ${baseY} Z`;
  const peak = Math.max(...values, 0);
  const peakLabel = MONTH_LABELS[values.indexOf(peak)] ?? "";

  return (
    <section className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-bold text-ink">Monthly Expenditure</h2>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`h-8 rounded-full px-4 text-[13px] font-semibold ${
                period === p.key ? "bg-brand text-white" : "bg-brand-tint text-muted hover:text-brand"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {values.length < 2 ? (
        <p className="mt-4 flex h-[200px] items-center justify-center text-[13px] text-muted">{error ?? "Loading…"}</p>
      ) : (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Monthly purchase order spend, ${MONTH_LABELS[0]} to ${MONTH_LABELS[MONTH_LABELS.length - 1]}. Peaks at ${formatRandCompact(peak)} in ${peakLabel}.`}
      >
        <path d={area} fill="#0B4C8C" opacity={0.1} />
        <path d={line} fill="none" stroke="#0B4C8C" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={0} x2={W} y1={baseY} y2={baseY} stroke="#DCE3EC" strokeWidth={1} />
        {MONTH_LABELS.map((m, i) => (
          <text
            key={`${m}-${i}`}
            x={i === 0 ? 4 : i === MONTH_LABELS.length - 1 ? W - 4 : i * step}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === MONTH_LABELS.length - 1 ? "end" : "middle"}
            fontSize={11}
            fill="#5C6B7F"
            letterSpacing={0.8}
          >
            {m}
          </text>
        ))}
      </svg>
      )}
    </section>
  );
}
