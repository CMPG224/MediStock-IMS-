"use client";

import { useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Icon from "@/components/Icon";
import FilterMenu from "@/components/medicine/FilterMenu";
import AddCard from "@/components/medicine/AddCard";
import Avatar from "@/components/ui/Avatar";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import StatusDot from "@/components/ui/StatusDot";
import { BTN_PRIMARY, CARD, TD, TH } from "@/components/ui/buttons";
import { formatDate } from "@/lib/format";
import { PAGE_SIZE, pageCount } from "@/lib/data/query";
import { fetchFeaturedSuppliers, fetchSuppliers } from "@/lib/data/suppliers";
import { useSearchQuery } from "@/lib/useSearchQuery";
import { useAsync } from "@/lib/useAsync";
import AddSupplierModal from "./AddSupplierModal";
import FeaturedSupplierCard from "./FeaturedSupplierCard";

const FILTERS = ["All", "Active", "Inactive"] as const;
type Filter = (typeof FILTERS)[number];

export default function SuppliersView() {
  const [filter, setFilter] = useState<Filter>("All");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const q = useSearchQuery();
  const list = useAsync(() => fetchSuppliers(filter, page, q), [filter, page, q]);
  const featured = useAsync(fetchFeaturedSuppliers, []);

  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const first = (page - 1) * PAGE_SIZE + 1;
  const noun = total === 1 ? "supplier" : "suppliers";
  const suffix = filter === "All" ? "" : ` matching "${filter}"`;
  const summary = !list.data
    ? "Loading…"
    : total === 0
      ? `No ${noun}${suffix}`
      : `Showing ${first} to ${first + rows.length - 1} of ${total} ${noun}${suffix}`;

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
        title="Supplier Management"
        description="Monitor and manage your network of global medical distributors."
        actions={
          <button type="button" className={BTN_PRIMARY} onClick={() => setOpen(true)}>
            <Icon name="add" size={20} /> Add New Supplier
          </button>
        }
      />

      {(list.error || featured.error) && <LoadError message={list.error ?? featured.error!} onRetry={refresh} />}

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {(featured.data ?? []).map((s) => (
          <FeaturedSupplierCard key={s.id} {...s} />
        ))}
        <AddCard label="Add Featured Supplier" onClick={() => setOpen(true)} />
      </div>

      <section className={`${CARD} overflow-hidden`} aria-labelledby="sup-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <h2 id="sup-list-title" className="text-[18px] font-bold text-ink">Supplier Directory</h2>
          <FilterMenu options={FILTERS} value={filter} onChange={changeFilter} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13.5px]">
            <thead className="bg-[#F1F4F9]">
              <tr>
                {["Supplier Name", "Contact Person", "Phone / Email", "Medicines", "Last Delivery", "Status"].map((h) => (
                  <th key={h} scope="col" className={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-border-soft last:border-b-0">
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <Avatar letter={s.name[0].toUpperCase()} />
                      <div className="flex flex-col">
                        <span className="font-bold text-ink">{s.name}</span>
                        <span className="text-[12px] text-muted">{s.type}</span>
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} text-body`}>{s.contact}</td>
                  <td className={TD}>
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap text-body">{s.phone}</span>
                      {s.email && <a href={`mailto:${s.email}`} className="text-[12.5px] text-brand hover:underline">{s.email}</a>}
                    </div>
                  </td>
                  <td className={TD}>
                    <span className="inline-block whitespace-nowrap rounded-full bg-[#E4EBF7] px-3 py-1 font-mono text-[12px] text-ink">
                      {s.skuCount} SKU
                    </span>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-body`}>{formatDate(s.lastDelivery)}</td>
                  <td className={TD}>
                    <StatusDot tone={s.status === "Active" ? "success" : "muted"}>{s.status}</StatusDot>
                  </td>
                </tr>
              ))}
              {list.data && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted">No suppliers match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border-soft">
          <Pagination summary={summary} page={page} pages={pageCount(total)} onPageChange={setPage} />
        </div>
      </section>

      <AddSupplierModal open={open} onClose={() => setOpen(false)} onCreated={refresh} />
    </>
  );
}
