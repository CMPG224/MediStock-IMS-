"use client";

import Icon from "../Icon";

/** "Showing 1 to 10 of 1,284 medicines" + page buttons (a window of up to 5). */
export default function Pagination({
  summary,
  page,
  pages,
  onPageChange,
  compact = false,
}: {
  summary: string;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  /** Prev/next arrows only (the Purchase Orders layout). */
  compact?: boolean;
}) {
  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-white px-2 text-[13.5px] font-semibold text-ink hover:bg-page disabled:cursor-not-allowed disabled:opacity-40";
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <span className="text-[12.5px] text-muted">{summary}</span>
      <div className="flex items-center gap-2" role="navigation" aria-label="Pagination">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <Icon name="chevron_left" size={16} />
        </button>
        {!compact &&
          numbers.map((n) => (
            <button
              key={n}
              type="button"
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPageChange(n)}
              className={`${btn} ${n === page ? "!border-brand !bg-brand !text-white" : ""}`}
            >
              {n}
            </button>
          ))}
        <button type="button" className={btn} disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </div>
  );
}
