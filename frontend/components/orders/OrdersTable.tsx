import Icon from "@/components/Icon";
import Avatar from "@/components/ui/Avatar";
import Pagination from "@/components/ui/Pagination";
import { CARD, TD, TH } from "@/components/ui/buttons";
import type { PurchaseOrder } from "@/lib/data/orders";
import { STATUS_LABEL, STATUS_PILL, formatRand, longDay } from "./utils";

const LINK = "text-[13px] font-bold text-brand hover:underline";
const ICON_BTN = "rounded-lg p-2 text-body hover:bg-page";

export default function OrdersTable({
  orders,
  loaded,
  summary,
  page,
  pages,
  onPageChange,
  onReview,
  onApprove,
  onReorder,
  onDownload,
}: {
  orders: PurchaseOrder[];
  loaded: boolean;
  summary: string;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  onReview: (po: PurchaseOrder) => void;
  onApprove: (po: PurchaseOrder) => void;
  onReorder: (po: PurchaseOrder) => void;
  onDownload: () => void;
}) {
  return (
    <section className={`${CARD} overflow-hidden`} aria-labelledby="recent-orders">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 id="recent-orders" className="text-[18px] font-bold text-ink">Recent Purchase Orders</h2>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Download orders as CSV" onClick={onDownload} className={ICON_BTN}>
            <Icon name="download" size={19} />
          </button>
          <button type="button" aria-label="More options" className={ICON_BTN}>
            <Icon name="more_vert" size={19} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-[#F3F6FB]">
            <tr>
              <th scope="col" className={TH}>Order ID</th>
              <th scope="col" className={TH}>Supplier</th>
              <th scope="col" className={TH}>Date</th>
              <th scope="col" className={TH}>Total Amount</th>
              <th scope="col" className={TH}>Status</th>
              <th scope="col" className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loaded && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[14px] text-muted">No purchase orders yet.</td>
              </tr>
            )}
            {orders.map((po) => (
              <tr key={po.id} className="border-b border-border-soft text-[14px] last:border-b-0">
                <td className={`${TD} whitespace-nowrap font-mono text-[13px] text-brand`}>{po.number}</td>
                <td className={TD}>
                  <div className="flex items-center gap-3">
                    <Avatar letter={po.supplier.charAt(0)} size={36} />
                    <div className="flex flex-col">
                      <span className="font-bold text-ink">{po.supplier}</span>
                      <span className="text-[11.5px] text-muted">Priority: {po.priority}</span>
                    </div>
                  </div>
                </td>
                <td className={`${TD} whitespace-nowrap text-body`}>{longDay(po.date)}</td>
                <td className={`${TD} whitespace-nowrap font-bold text-ink`}>{formatRand(po.total)}</td>
                <td className={TD}>
                  <span className={`inline-flex rounded-full border px-3 py-0.5 text-[12px] font-semibold ${STATUS_PILL[po.status]}`}>
                    {STATUS_LABEL[po.status]}
                  </span>
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-4">
                    {po.status === "pending" &&
                      (po.priority === "Critical" ? (
                        <button type="button" className={LINK} onClick={() => onApprove(po)} aria-label={`Approve order ${po.number}`}>
                          Approve
                        </button>
                      ) : (
                        <button type="button" className={LINK} onClick={() => onReview(po)} aria-label={`Review order ${po.number}`}>
                          Review
                        </button>
                      ))}
                    {(po.status === "approved" || po.status === "delayed") && (
                      <button type="button" className={LINK} onClick={() => onReview(po)} aria-label={`Details for order ${po.number}`}>
                        Details
                      </button>
                    )}
                    {po.status === "delivered" && (
                      <>
                        <button type="button" className={LINK} onClick={() => onReview(po)} aria-label={`View invoice for order ${po.number}`}>
                          View Invoice
                        </button>
                        <button type="button" className={LINK} onClick={() => onReorder(po)} aria-label={`Reorder ${po.number}`}>
                          Reorder
                        </button>
                      </>
                    )}
                    {po.status === "cancelled" && (
                      <button type="button" className={LINK} onClick={() => onReview(po)} aria-label={`Details for order ${po.number}`}>
                        Details
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination summary={summary} compact page={page} pages={pages} onPageChange={onPageChange} />
    </section>
  );
}
