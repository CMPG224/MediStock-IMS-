"use client";

import Icon from "@/components/Icon";
import { CARD } from "@/components/ui/buttons";
import { fetchReports, type ReportCard } from "@/lib/data/reports";
import { useAsync } from "@/lib/useAsync";

const TINT: Record<ReportCard["tone"], string> = {
  danger: "bg-[#FDE4E1] text-danger",
  brand: "bg-[#DDE7F7] text-brand",
  success: "bg-[#C9F2DE] text-success",
};

export default function AvailableReports() {
  const { data, error } = useAsync(fetchReports, []);
  return (
    <section aria-labelledby="available-reports" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="available-reports" className="text-[22px] font-bold text-ink">
          Available Reports
        </h2>
        <a href="#" className="flex items-center gap-1 text-[14px] font-semibold text-brand hover:underline">
          View All <Icon name="open_in_new" size={14} />
        </a>
      </div>
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {error && <p className="text-[13.5px] text-danger">{error}</p>}
        {(data ?? []).map((r) => (
          <a
            key={r.slug}
            href={`#${r.slug}`}
            className={`${CARD} group flex flex-col gap-3 p-6 transition-shadow hover:border-brand/30 hover:shadow-[0_6px_18px_rgba(16,35,64,.10)]`}
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${TINT[r.tone]}`}>
              <Icon name={r.icon} size={22} />
            </span>
            <h3 className="text-[18px] font-bold text-ink">{r.title}</h3>
            <p className="text-[14px] leading-relaxed text-body">{r.description}</p>
            <div className="mt-auto flex items-center justify-between pt-3 text-[13.5px] text-muted">
              <span>{r.footer}</span>
              <Icon name="arrow_forward" size={18} className="text-brand transition-transform group-hover:translate-x-0.5" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
