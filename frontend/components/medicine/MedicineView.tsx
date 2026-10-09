"use client";

import { useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Icon from "@/components/Icon";
import Avatar from "@/components/ui/Avatar";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import StatusDot from "@/components/ui/StatusDot";
import { BTN_PRIMARY, CARD, TD, TH } from "@/components/ui/buttons";
import { formatDate } from "@/lib/format";
import { fetchFeaturedMedicines, fetchMedicines, type MedicineFilter, type MedicineStatus } from "@/lib/data/medicine";
import { PAGE_SIZE, pageCount } from "@/lib/data/query";
import { useSearchQuery } from "@/lib/useSearchQuery";
import { useAsync } from "@/lib/useAsync";
import AddCard from "./AddCard";
import AddMedicineModal from "./AddMedicineModal";
import FeaturedCard from "./FeaturedCard";
import FilterMenu from "./FilterMenu";
import MedicineDetailModal from "./MedicineDetailModal";

const FILTERS = ["All", "In Stock", "Low Stock", "Expiring Soon"] as const satisfies readonly MedicineFilter[];
type Filter = (typeof FILTERS)[number];
const TONE: Record<MedicineStatus, "success" | "danger"> = {
  "In Stock": "success",
  "Low Stock": "danger",
  "Expiring Soon": "danger",
  Expired: "danger",
};

export default function MedicineView() {
  const [filter, setFilter] = useState<Filter>("All");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const q = useSearchQuery();
  const list = useAsync(() => fetchMedicines(filter, page, q), [filter, page, q]);
  const featured = useAsync(fetchFeaturedMedicines, []);

  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const first = (page - 1) * PAGE_SIZE + 1;
  const noun = total === 1 ? "medicine" : "medicines";
  const summary = !list.data
    ? "Loading…"
    : total === 0
      ? `No ${noun}${filter === "All" ? "" : ` matching "${filter}"`}`
      : `Showing ${first} to ${first + rows.length - 1} of ${total.toLocaleString("en-US")} ${noun}${filter === "All" ? "" : ` matching "${filter}"`}`;

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };
  const refresh = () => {
    list.reload();
    featured.reload();
  };

  return (
    <>
      <PageHeader
        title="Medicine Inventory"
        description="Track stock levels, batches, and expiry dates across your pharmacy."
        actions={
          <button type="button" className={BTN_PRIMARY} onClick={() => setOpen(true)}>
            <Icon name="add" size={20} /> Add Medicine
          </button>
        }
      />

      {(list.error || featured.error) && <LoadError message={list.error ?? featured.error!} onRetry={refresh} />}

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {(featured.data ?? []).map((m) => (
          <FeaturedCard key={m.id} {...m} onOpen={() => setSelected(m.id)} />
        ))}
        <AddCard label="Add New Medicine" onClick={() => setOpen(true)} />
      </div>

      <section className={`${CARD} overflow-hidden`} aria-labelledby="med-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <h2 id="med-list-title" className="text-[18px] font-bold text-ink">Medicine Inventory List</h2>
          <FilterMenu options={FILTERS} value={filter} onChange={changeFilter} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-[13.5px]">
            <thead className="bg-[#F1F4F9]">
              <tr>
                {["Medicine", "Batch No.", "Stock Level", "Stock Qty", "Expiry Date", "Status"].map((h) => (
                  <th key={h} scope="col" className={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} onClick={() => setSelected(m.id)} className="cursor-pointer border-b border-border-soft last:border-b-0 hover:bg-page">
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <Avatar letter={m.name[0].toUpperCase()} />
                      <button
                        type="button"
                        onClick={() => setSelected(m.id)}
                        aria-label={`View ${m.name}`}
                        className="flex flex-col text-left hover:underline"
                      >
                        <span className="font-bold text-ink">{m.name}</span>
                        <span className="text-[12px] text-muted">{m.category}</span>
                      </button>
                    </div>
                  </td>
                  <td className={`${TD} text-body`}>{m.batchNo}</td>
                  <td className={TD}>
                    <div className="flex flex-col">
                      <span className="text-body">Current: {m.stock} units</span>
                      <span className="text-[12px] text-brand">Reorder at: {m.reorderAt} units</span>
                    </div>
                  </td>
                  <td className={TD}>
                    <span className="inline-block whitespace-nowrap rounded-full bg-[#E4EBF7] px-3 py-1 font-mono text-[12px] text-ink">
                      {m.stock} units
                    </span>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-body`}>{formatDate(m.expiry)}</td>
                  <td className={TD}>
                    <StatusDot tone={TONE[m.status]}>{m.status}</StatusDot>
                  </td>
                </tr>
              ))}
              {list.data && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted">
                    {filter === "All" ? "No medicines yet. Add the first one above." : "No medicines match this filter."}
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

      <MedicineDetailModal medicineId={selected} onClose={() => setSelected(null)} onChanged={refresh} />
      <AddMedicineModal open={open} onClose={() => setOpen(false)} onCreated={refresh} />
    </>
  );
}
