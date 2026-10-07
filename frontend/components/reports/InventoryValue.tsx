"use client";

import { CARD } from "@/components/ui/buttons";
import { formatRandCompact } from "@/lib/format";
import { fetchInventoryValue } from "@/lib/data/reports";
import { useAsync } from "@/lib/useAsync";

export default function InventoryValue() {
  const { data } = useAsync(fetchInventoryValue, []);
  const INVENTORY_VALUE = data?.slices ?? [];
  const r = 70;
  const c = 2 * Math.PI * r;
  const gap = 3;
  const slices = INVENTORY_VALUE.map((s, i) => ({
    ...s,
    len: (s.percent / 100) * c,
    offset: INVENTORY_VALUE.slice(0, i).reduce((a, x) => a + (x.percent / 100) * c, 0),
  }));
  const summary = INVENTORY_VALUE.map((s) => `${s.label} ${s.percent}%`).join(", ");

  return (
    <section className={`${CARD} flex flex-col p-6`}>
      <h2 className="text-[18px] font-bold text-ink">Inventory Value</h2>
      <div className="my-5 flex justify-center">
        <div className="relative h-[180px] w-[180px]">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label={`Inventory value by category: ${summary}`}>
            <circle cx={90} cy={90} r={r} fill="none" stroke="#EAF0FA" strokeWidth={20} />
            {slices.map((s) => (
              <circle
                key={s.label}
                cx={90}
                cy={90}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={20}
                strokeDasharray={`${s.len - gap} ${c - s.len + gap}`}
                strokeDashoffset={-s.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-bold text-ink">{data ? formatRandCompact(data.total) : "—"}</span>
            <span className="text-[12.5px] text-muted">Total Value</span>
          </div>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {INVENTORY_VALUE.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-[14px]">
            <span className="flex items-center gap-2.5 text-body">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </span>
            <span className="font-bold text-ink">{s.percent}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
