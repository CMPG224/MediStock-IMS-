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

export type ReportPdfData = {
  /** Optional AI-written summary printed under the title. */
  summary?: string;
  expenditure: { labels: string[]; values: number[] };
  inventory: { total: number; slices: { label: string; percent: number }[] };
  suppliers: { name: string; rate: number }[];
  turnover: { labels: string[]; values: number[] };
};

/** Reports & Analytics summary: one table per chart on the page. */
export async function buildReportPdf(d: ReportPdfData): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const head = { fillColor: [31, 78, 140] as [number, number, number] };

  doc.setFontSize(20).text("MediStock IMS", 40, 50);
  doc.setFontSize(12).text("Reports & Analytics", 40, 72);
  doc.setFontSize(10).setTextColor(90).text(`Generated ${formatDate(new Date().toISOString())}`, 40, 90).setTextColor(0);
  let top = 90;
  if (d.summary) {
    const lines = doc.setFontSize(10).splitTextToSize(d.summary, 515) as string[];
    doc.setFont("helvetica", "bold").text("Summary", 40, 112).setFont("helvetica", "normal").text(lines, 40, 128);
    top = 128 + lines.length * 12;
  }

  const section = (title: string, headRow: string[], body: (string | number)[][]) => {
    const prev = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    const y = (prev?.finalY ?? top) + 28;
    doc.setFontSize(12).text(title, 40, y);
    autoTable(doc, { startY: y + 8, head: [headRow], body, headStyles: head });
  };

  section("Monthly expenditure", ["Month", "Spend"], d.expenditure.labels.map((l, i) => [l, formatRand(d.expenditure.values[i])]));
  section(
    `Inventory value by category (total ${formatRand(d.inventory.total)})`,
    ["Category", "Share"],
    d.inventory.slices.map((s) => [s.label, `${s.percent}%`]),
  );
  section("Supplier performance", ["Supplier", "Fulfilment rate"], d.suppliers.map((s) => [s.name, `${s.rate}%`]));
  section("Stock turnover", ["Month", "Turnover"], d.turnover.labels.map((l, i) => [l, d.turnover.values[i]]));

  return doc.output("blob");
}
