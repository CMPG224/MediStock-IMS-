"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import Avatar from "@/components/ui/Avatar";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import { BTN_OUTLINE, CARD, TD, TH } from "@/components/ui/buttons";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { LOGS, LOG_CATEGORIES, LOG_TOTAL, type LogResult } from "@/lib/mock/logs";

const RESULT_TONE: Record<LogResult, BadgeTone> = { Success: "success", Warning: "warning", Failed: "danger" };

export default function LogsView() {
  const [category, setCategory] = useState<(typeof LOG_CATEGORIES)[number]>("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LOGS.filter(
      (l) =>
        (category === "All" || l.category === category) &&
        (!q || [l.user, l.action, l.entity, l.ip, l.timestamp, l.result].some((v) => v.toLowerCase().includes(q))),
    );
  }, [category, query]);

  const filtered = category !== "All" || query.trim() !== "";
  const summary = filtered
    ? `Showing ${rows.length} of ${LOGS.length} loaded events`
    : `Showing 1 to ${LOGS.length} of ${LOG_TOTAL.toLocaleString("en-US")} events`;

  return (
    <div className="flex flex-1 flex-col gap-[22px] p-7">
      <PageHeader
        title="Activity Logs"
        description="A complete audit trail of every action taken in the system."
        actions={
          <button type="button" className={BTN_OUTLINE}>
            <Icon name="download" size={18} />
            Export CSV
          </button>
        }
      />

      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
        {LOG_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={`h-9 rounded-full px-4 text-[13.5px] font-semibold ${
              category === c ? "bg-brand text-white" : "border border-border bg-white text-body hover:bg-page"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <section className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">Audit Trail</h2>
          <div className="flex h-10 w-full max-w-[300px] items-center gap-2 rounded-full border border-border bg-[#FBFCFE] px-4">
            <Icon name="search" size={17} className="text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search activity logs in table"
              placeholder="Filter events..."
              className="w-full bg-transparent text-[13.5px] text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-y border-border-soft bg-brand-tint/60">
                <th scope="col" className={TH}>Timestamp</th>
                <th scope="col" className={TH}>User</th>
                <th scope="col" className={TH}>Action</th>
                <th scope="col" className={TH}>Entity</th>
                <th scope="col" className={TH}>IP Address</th>
                <th scope="col" className={TH}>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-border-soft text-[14px] last:border-b-0">
                  <td className={`${TD} whitespace-nowrap font-mono text-[13px] text-body`}>{l.timestamp}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <Avatar letter={l.user === "Unknown" ? "?" : l.user.replace("Dr. ", "").charAt(0)} size={34} />
                      <div className="flex flex-col">
                        <span className="font-bold text-ink">{l.user}</span>
                        <span className="text-[12.5px] text-muted">{l.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} font-medium text-ink`}>{l.action}</td>
                  <td className={`${TD} text-body`}>{l.entity}</td>
                  <td className={`${TD} font-mono text-[13px] text-body`}>{l.ip}</td>
                  <td className={TD}>
                    <Badge tone={RESULT_TONE[l.result]}>{l.result}</Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[14px] text-muted">
                    No events match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border-soft">
          <Pagination summary={summary} pages={351} />
        </div>
      </section>
    </div>
  );
}
