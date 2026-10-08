"use client";

import { useState } from "react";
import PdfViewer from "@/components/pdf/PdfViewer";
import Modal from "@/components/ui/Modal";
import { BTN_SMALL_OUTLINE, TD, TH } from "@/components/ui/buttons";
import type { PurchaseOrder } from "@/lib/data/orders";
import { buildOrderPdf, downloadBlob } from "@/lib/pdf/generate";
import { STATUS_LABEL, formatRand, longDay } from "./utils";

export default function OrderDetailModal({
  order,
  onClose,
  onApprove,
  onCancel,
  onReorder,
}: {
  order: PurchaseOrder | null;
  onClose: () => void;
  onApprove: (po: PurchaseOrder) => void;
  onCancel: (po: PurchaseOrder) => void;
  onReorder: (po: PurchaseOrder) => void;
}) {
  const po = order;
  const [preview, setPreview] = useState<{ order: PurchaseOrder; blob: Blob } | null>(null);
  const pdf = po && preview?.order === po ? preview.blob : null;
  const showPdf = async () => po && setPreview({ order: po, blob: await buildOrderPdf(po) });
  return (
    <Modal
      open={po !== null}
      onClose={onClose}
      title={po ? `Order ${po.number}` : "Order"}
      subtitle={po ? `${po.supplier} · ${longDay(po.date)} · ${STATUS_LABEL[po.status]} · Priority: ${po.priority}` : undefined}
      footer={
        po && (
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className={BTN_SMALL_OUTLINE}>Close</button>
            <button type="button" onClick={() => (pdf ? setPreview(null) : void showPdf())} className={BTN_SMALL_OUTLINE}>
              {pdf ? "Hide PDF" : "Preview PDF"}
            </button>
            <button
              type="button"
              onClick={async () => downloadBlob(pdf ?? (await buildOrderPdf(po)), `${po.number.replace("#", "")}.pdf`)}
              className={BTN_SMALL_OUTLINE}
            >
              Download PDF
            </button>
            {po.status === "pending" && (
              <>
                <button type="button" onClick={() => onCancel(po)} className={BTN_SMALL_OUTLINE}>Cancel order</button>
                <button type="button" onClick={() => onApprove(po)} className="h-9 rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark">
                  Approve
                </button>
              </>
            )}
            {po.status === "delivered" && (
              <button type="button" onClick={() => onReorder(po)} className="h-9 rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark">
                Reorder
              </button>
            )}
          </div>
        )
      }
    >
      {po && pdf && <PdfViewer blob={pdf} />}
      {po && !pdf && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-[14px]">
            <thead className="bg-[#F3F6FB]">
              <tr>
                <th scope="col" className={TH}>Medicine</th>
                <th scope="col" className={`${TH} text-right`}>Qty</th>
                <th scope="col" className={`${TH} text-right`}>Unit cost</th>
                <th scope="col" className={`${TH} text-right`}>Line total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((i, idx) => (
                <tr key={idx} className="border-b border-border-soft">
                  <td className={`${TD} font-medium text-ink`}>{i.medicine}</td>
                  <td className={`${TD} text-right`}>{i.quantity}</td>
                  <td className={`${TD} text-right`}>{formatRand(i.unitCost)}</td>
                  <td className={`${TD} text-right`}>{formatRand(i.quantity * i.unitCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className={`${TD} text-right font-bold text-ink`}>Total</th>
                <td className={`${TD} text-right font-bold text-ink`}>{formatRand(po.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}
