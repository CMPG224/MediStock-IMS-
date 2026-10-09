"use client";

import { useDeferredValue, useState } from "react";
import Icon from "@/components/Icon";
import Avatar from "@/components/ui/Avatar";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import { BTN_OUTLINE, CARD, TD, TH } from "@/components/ui/buttons";
import PageHeader from "@/components/ui/PageHeader";
import LoadError from "@/components/ui/LoadError";
import Pagination from "@/components/ui/Pagination";
import { initial } from "@/lib/format";
import { LOG_CATEGORIES, fetchLogs, type LogEntry, type LogResult } from "@/lib/data/logs";
import { PAGE_SIZE, pageCount } from "@/lib/data/query";
import { useSearchQuery } from "@/lib/useSearchQuery";
import { useAsync } from "@/lib/useAsync";

const RESULT_TONE: Record<LogResult, BadgeTone> = { Success: "success", Warning: "warning", Failed: "danger" };

export default function LogsView() {
  const [category, setCategory] = useState<(typeof LOG_CATEGORIES)[number]>("All");
  const headerQuery = useSearchQuery();
  const [query, setQuery] = useState(headerQuery);
  const [page, setPage] = useState(1);
  const search = useDeferredValue(query);
  const list = useAsync(() => fetchLogs(category, search, page), [category, search, page]);

  const rows: LogEntry[] = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const first = (page - 1) * PAGE_SIZE + 1;
  const summary = !list.data
    ? "Loading…"
    : total === 0
      ? "No events"
      : `Showing ${first} to ${first + rows.length - 1} of ${total.toLocaleString("en-US")} events`;

  function downloadCsv() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = ["Timestamp", "User", "Role", "Action", "Category", "Entity", "IP Address", "Result"];
    const body = rows.map((l) => [l.timestamp, l.user, l.role, l.action, l.category, l.entity, l.ip, l.result]);
    const blob = new Blob([[header, ...body].map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col gap-[22px] p-7">
      <PageHeader
        title="Activity Logs"
        description="A complete audit trail of every action taken in the system."
        actions={
          <button type="button" className={BTN_OUTLINE} onClick={downloadCsv}>
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
            onClick={() => {
              setCategory(c);
              setPage(1);
            }}
            className={`h-9 rounded-full px-4 text-[13.5px] font-semibold ${
              category === c ? "bg-brand text-white" : "border border-border bg-white text-body hover:bg-page"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {list.error && <LoadError message={list.error} onRetry={list.reload} />}

      <section className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h2 className="text-[18px] font-bold text-ink">Audit Trail</h2>
          <div className="flex h-10 w-full max-w-[300px] items-center gap-2 rounded-full border border-border bg-[#FBFCFE] px-4">
            <Icon name="search" size={17} className="text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
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
                      <Avatar letter={l.user === "Unknown" ? "?" : initial(l.user)} size={34} />
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
              {list.data && rows.length === 0 && (
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
          <Pagination summary={summary} page={page} pages={pageCount(total)} onPageChange={setPage} />
        </div>
      </section>
    </div>
  );
}
