"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import LoadError from "@/components/ui/LoadError";
import PageHeader from "@/components/ui/PageHeader";
import { PAGE_SIZE, pageCount } from "@/lib/data/query";
import { fetchMedicineOptions, fetchTimeline, fetchTransactions, recordTransaction, type TxType } from "@/lib/data/transactions";
import { useAsync } from "@/lib/useAsync";
import ActivityTable from "./ActivityTable";
import LiveTimeline from "./LiveTimeline";
import StockModal, { type StockValues } from "./StockModal";
import { csvEscape, shortDay } from "./utils";

type Filter = "all" | TxType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All Transactions" },
  { key: "in", label: "Stock In" },
  { key: "out", label: "Stock Out" },
  { key: "damaged", label: "Damaged" },
  { key: "return", label: "Returns" },
  { key: "expired", label: "Expired" },
];

export default function TransactionsView() {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"in" | "out" | null>(null);
  const list = useAsync(() => fetchTransactions(filter, page), [filter, page]);
  const timeline = useAsync(fetchTimeline, []);
  const medicines = useAsync(() => (modal ? fetchMedicineOptions() : Promise.resolve([])), [modal !== null]);

  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const first = (page - 1) * PAGE_SIZE + 1;
  const label = filter === "all" ? "transactions" : FILTERS.find((f) => f.key === filter)!.label.toLowerCase();
  const summary = !list.data
    ? "Loading…"
    : total === 0
      ? `No ${label}`
      : `Showing ${first}–${first + rows.length - 1} of ${total.toLocaleString("en-ZA")} ${label}`;

  async function record(kind: "in" | "out", v: StockValues) {
    await recordTransaction({ medicineId: v.medicineId, type: kind, quantity: v.quantity, batch: v.batch, note: v.notes });
    setModal(null);
    list.reload();
    timeline.reload();
  }

  function changeFilter(f: Filter) {
    setFilter(f);
    setPage(1);
  }

  function downloadCsv() {
    const header = ["Transaction ID", "Date", "Time", "Item", "Type", "Quantity", "Status", "By"];
    const body = rows.map((t) => [t.reference, shortDay(t.day), t.time, t.item, t.type, t.quantity, t.status, t.actor]);
    const blob = new Blob([[header, ...body].map((r) => r.map(csvEscape).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Inventory Transactions"
        description="Monitoring real-time pharmaceutical stock movements across all departments."
        actions={
          <>
            <button
              type="button"
              onClick={() => setModal("in")}
              className="flex h-[42px] items-center gap-2 rounded-full bg-[#12B57F] px-5 text-[14px] font-bold text-white hover:bg-[#0FA173]"
            >
              <Icon name="add_circle" size={19} /> Stock In
            </button>
            <button
              type="button"
              onClick={() => setModal("out")}
              className="flex h-[42px] items-center gap-2 rounded-full bg-brand px-5 text-[14px] font-bold text-white hover:bg-brand-dark"
            >
              <Icon name="remove_circle" size={19} /> Stock Out
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-3" role="group" aria-label="Filter transactions by type">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => changeFilter(f.key)}
              className={`h-[42px] rounded-full border px-5 text-[14px] font-medium transition-colors ${
                active ? "border-brand bg-brand text-white" : "border-border bg-white text-body hover:bg-page"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {(list.error || timeline.error) && (
        <LoadError message={list.error ?? timeline.error!} onRetry={() => { list.reload(); timeline.reload(); }} />
      )}

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[2fr_1fr]">
        <ActivityTable
          rows={rows}
          loaded={!!list.data}
          summary={summary}
          page={page}
          pages={pageCount(total)}
          onPageChange={setPage}
          onDownload={downloadCsv}
        />
        <LiveTimeline txs={timeline.data ?? []} />
      </div>

      <StockModal kind={modal} onClose={() => setModal(null)} onSubmit={record} medicines={medicines.data ?? []} />
    </>
  );
}
