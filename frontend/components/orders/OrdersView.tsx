"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import LoadError from "@/components/ui/LoadError";
import PageHeader from "@/components/ui/PageHeader";
import { BTN_PRIMARY } from "@/components/ui/buttons";
import { formatRand } from "@/lib/format";
import { createOrder, fetchOrderStats, fetchOrders, setOrderStatus, type NewOrder, type PurchaseOrder } from "@/lib/data/orders";
import { pageCount } from "@/lib/data/query";
import { errorMessage, useAsync } from "@/lib/useAsync";
import CreateOrderModal from "./CreateOrderModal";
import OrderDetailModal from "./OrderDetailModal";
import OrdersTable from "./OrdersTable";
import StatCard from "./StatCard";

export default function OrdersView() {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [actionError, setActionError] = useState("");
  const list = useAsync(() => fetchOrders(page), [page]);
  const stats = useAsync(fetchOrderStats, []);

  const orders = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;

  function refresh() {
    list.reload();
    stats.reload();
  }

  async function run(action: () => Promise<void>) {
    setActionError("");
    try {
      await action();
      setDetail(null);
      refresh();
    } catch (e) {
      setActionError(errorMessage(e));
      setDetail(null);
    }
  }

  async function create(o: NewOrder) {
    await createOrder(o);
    setCreating(false);
    setPage(1);
    refresh();
  }

  const approve = (po: PurchaseOrder) => run(() => setOrderStatus(po.id, "approved"));
  const cancel = (po: PurchaseOrder) => run(() => setOrderStatus(po.id, "cancelled"));
  const reorder = (po: PurchaseOrder) =>
    run(() =>
      createOrder({
        supplierId: po.supplierId,
        priority: po.priority,
        items: po.items.map(({ medicineId, quantity, unitCost }) => ({ medicineId, quantity, unitCost })),
      }),
    );

  function downloadCsv() {
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = [["Order ID", "Supplier", "Priority", "Date", "Total (ZAR)", "Status"], ...orders.map((o) => [o.number, o.supplier, o.priority, o.date, o.total.toFixed(2), o.status])];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = stats.data;
  const error = actionError || list.error || stats.error;

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Manage and track procurement requests across all suppliers."
        actions={
          <button type="button" onClick={() => setCreating(true)} className={`${BTN_PRIMARY} !rounded-[10px] text-[13px] uppercase tracking-[.06em]`}>
            <Icon name="add" size={19} /> Create Purchase Order
          </button>
        }
      />

      {error && <LoadError message={error} onRetry={actionError ? () => setActionError("") : refresh} />}

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
        <StatCard
          label="Pending Approval"
          value={s?.pending ?? 0}
          caption="Awaiting review"
          captionClass="text-brand"
          captionIcon="schedule"
          icon="assignment_clock"
          iconClass="bg-[#DDE7F7] text-brand"
        />
        <StatCard label="Approved Orders" value={s?.approved ?? 0} caption="Ready for shipment" icon="check_circle" iconClass="bg-[#5EF0B8] text-[#0B7A54]" />
        <StatCard
          label="Delivered (MTD)"
          value={s?.deliveredMtd ?? 0}
          caption={`Total value: ${formatRand(s?.deliveredMtdValue ?? 0)}`}
          icon="local_shipping"
          iconClass="bg-[#DDE7F7] text-brand"
        />
      </div>

      <OrdersTable
        orders={orders}
        loaded={!!list.data}
        summary={list.data ? `Showing ${orders.length} of ${total} orders` : "Loading…"}
        page={page}
        pages={pageCount(total)}
        onPageChange={setPage}
        onReview={setDetail}
        onApprove={approve}
        onReorder={reorder}
        onDownload={downloadCsv}
      />

      <CreateOrderModal open={creating} onClose={() => setCreating(false)} onSubmit={create} />
      <OrderDetailModal order={detail} onClose={() => setDetail(null)} onApprove={approve} onCancel={cancel} onReorder={reorder} />
    </>
  );
}
