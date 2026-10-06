"use client";

import { useState } from "react";
import Icon from "../Icon";

/** "Showing 1 to 4 of 1,284 medicines" + numbered page buttons. Purely
 * presentational for now — it tracks the current page in state but the
 * table beside it isn't re-sliced (there's no backend to page against). */
export default function Pagination({
  summary,
  pages = 3,
  compact = false,
}: {
  summary: string;
  pages?: number;
  /** Prev/next arrows only (the Purchase Orders layout). */
  compact?: boolean;
}) {
  const [page, setPage] = useState(1);
  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-white px-2 text-[13.5px] font-semibold text-ink hover:bg-page disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <span className="text-[12.5px] text-muted">{summary}</span>
      <div className="flex items-center gap-2" role="navigation" aria-label="Pagination">
        <button type="button" className={btn} disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
          <Icon name="chevron_left" size={16} />
        </button>
        {!compact &&
          Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-current={n === page ? "page" : undefined}
              onClick={() => setPage(n)}
              className={`${btn} ${n === page ? "!border-brand !bg-brand !text-white" : ""}`}
            >
              {n}
            </button>
          ))}
        <button type="button" className={btn} disabled={page === pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
          <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </div>
  );
}
