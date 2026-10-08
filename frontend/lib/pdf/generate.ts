import type { PurchaseOrder } from "@/lib/data/orders";
import { formatDate, formatRand } from "@/lib/format";

/** Builds a purchase-order PDF. jsPDF is imported lazily; callers get a Blob. */
export async function buildOrderPdf(po: PurchaseOrder): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  doc.setFontSize(20).text("MediStock IMS", 40, 50);
  doc.setFontSize(12).text(`Purchase Order ${po.number}`, 40, 72);
  doc.setFontSize(10).setTextColor(90);
  doc.text(
    [`Supplier: ${po.supplier}`, `Date: ${formatDate(po.date)}`, `Status: ${po.status}`, `Priority: ${po.priority}`],
    40,
    96,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 160,
    head: [["Medicine", "Qty", "Unit cost", "Line total"]],
    body: po.items.map((i) => [i.medicine, i.quantity, formatRand(i.unitCost), formatRand(i.quantity * i.unitCost)]),
    foot: [["", "", "Total", formatRand(po.total)]],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    headStyles: { fillColor: [31, 78, 140] },
    footStyles: { fillColor: [243, 246, 251], textColor: 0 },
  });

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
