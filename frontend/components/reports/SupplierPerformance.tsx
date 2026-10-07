"use client";

import { CARD } from "@/components/ui/buttons";
import { fetchSupplierPerformance } from "@/lib/data/reports";
import { useAsync } from "@/lib/useAsync";

const FILL = { success: "bg-success", brand: "bg-brand", danger: "bg-danger" } as const;

export default function SupplierPerformance() {
  const { data } = useAsync(fetchSupplierPerformance, []);
  return (
    <section className={`${CARD} p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[18px] font-bold text-ink">Supplier Performance</h2>
        <span className="text-[13.5px] text-muted">Fulfillment Rate</span>
      </div>
      <ul className="mt-6 flex flex-col gap-5">
        {data?.length === 0 && <li className="text-[13.5px] text-muted">No supplier orders yet.</li>}
        {(data ?? []).map((s, i) => (
          <li key={s.name}>
            <div className="mb-2 flex items-center justify-between text-[14px] text-ink">
              <span id={`sp-${i}`}>{s.name}</span>
              <span className="font-semibold">{s.rate}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={s.rate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-labelledby={`sp-${i}`}
              className="h-3 w-full overflow-hidden rounded-full bg-brand-tint"
            >
              <div className={`h-full rounded-full ${FILL[s.tone]}`} style={{ width: `${s.rate}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
