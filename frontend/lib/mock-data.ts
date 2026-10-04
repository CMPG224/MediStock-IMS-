//i will add data for mockdata the charts here while awaiting for the backend to be ready

export const currentUser = {
  name: "Dr. TR Mokwena",
  role: "Administrator",
  facility: "Newcastle General Hospital",
};


export type KpiTone = "default" | "danger" | "success";

export const KPIS: {
  icon: string;
  iconTone: "brand" | "ink" | "danger" | "brand2" | "muted" | "success";
  status: string;
  statusTone: "success" | "ink" | "danger" | "muted";
  label: string;
  value: string;
  tone: KpiTone;
}[] = [
  { icon: "medication", iconTone: "brand", status: "+4% ↗", statusTone: "success", label: "Total Medicines", value: "1,284", tone: "default" },
  { icon: "inventory_2", iconTone: "ink", status: "Stable", statusTone: "ink", label: "Total Suppliers", value: "42", tone: "default" },
  { icon: "warning", iconTone: "danger", status: "Critical", statusTone: "danger", label: "Low Stock", value: "18", tone: "danger" },
  { icon: "event_busy", iconTone: "brand2", status: "Next 7d", statusTone: "ink", label: "Expiring Soon", value: "32", tone: "default" },
  { icon: "block", iconTone: "muted", status: "Requires Action", statusTone: "danger", label: "Expired", value: "5", tone: "default" },
  { icon: "payments", iconTone: "success", status: "+12% ↗", statusTone: "success", label: "Total Value", value: "R142.5K", tone: "success" },
];


export const TREND_RANGES = {
  "1W": { labels: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], values: [22, 30, 36, 50, 58, 72, 86] },
  "1M": { labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"], values: [30, 26, 44, 40, 62, 70, 78] },
  "1Y": { labels: ["JAN", "MAR", "MAY", "JUL", "SEP", "NOV"], values: [18, 34, 28, 52, 60, 90] },
} as const;



export const STOCK_MOVEMENT = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  heights: [46, 78, 40, 100, 62, 94], 
};


export type TxStatus = "COMPLETED" | "PENDING" | "REJECTED";

export const TRANSACTIONS: {
  item: string;
  type: string;
  qty: string;
  qtyTone: "success" | "danger" | "neutral";
  status: TxStatus;
  time: string;
}[] = [
  { item: "Amoxicillin 500mg", type: "Stock In", qty: "+250 units", qtyTone: "success", status: "COMPLETED", time: "2 mins ago" },
  { item: "Ibuprofen 400mg", type: "Stock Out", qty: "−45 units", qtyTone: "danger", status: "COMPLETED", time: "15 mins ago" },
  { item: "Paracetamol Liquid", type: "Stock In", qty: "+100 units", qtyTone: "success", status: "PENDING", time: "1 hour ago" },
  { item: "Lipitor 20mg", type: "Stock Out", qty: "−12 units", qtyTone: "danger", status: "COMPLETED", time: "2 hours ago" },
  { item: "Metformin 500mg", type: "Return", qty: "+2 units", qtyTone: "neutral", status: "REJECTED", time: "3 hours ago" },
];



export const URGENT_ALERTS: {
  icon: string;
  borderColor: string;
  bg: string;
  iconColor: string;
  title: string;
  body: string;
  actionLabel: string;
  actionColor: string;
}[] = [
  {
    icon: "warning",
    borderColor: "#D92D20",
    bg: "#FEF4F3",
    iconColor: "#B42318",
    title: "Low Stock: Amoxicillin",
    body: "Current: 12 units. Reorder point: 50.",
    actionLabel: "CREATE ORDER",
    actionColor: "#B42318",
  },
  {
    icon: "history",
    borderColor: "#0B4C8C",
    bg: "#F4F7FD",
    iconColor: "#0B4C8C",
    title: "Expiring Soon: Batch #8812",
    body: "Insulin Glargine expires in 5 days.",
    actionLabel: "MARK REVIEWED",
    actionColor: "#0B4C8C",
  },
  {
    icon: "local_shipping",
    borderColor: "#0B7A54",
    bg: "#F2F9F5",
    iconColor: "#0B7A54",
    title: "Supplier Delay",
    body: "Global Pharma shipment delayed by 48h.",
    actionLabel: "CONTACT AGENT",
    actionColor: "#0B7A54",
  },
];


export const ALERTS: { id: string; icon: string; tone: "danger" | "warning" | "brand" | "success"; category: string; title: string; body: string; time: string; unread: boolean }[] = [
  { id: "al-1", icon: "warning", tone: "danger", category: "Stock", title: "Low Stock: Amoxicillin 500mg", body: "Current: 12 units. Reorder point: 50 units.", time: "2 mins ago", unread: true },
  { id: "al-2", icon: "event_busy", tone: "warning", category: "Stock", title: "Expiring Soon: Batch #8812", body: "Insulin Glargine expires in 5 days.", time: "1 hour ago", unread: true },
  { id: "al-3", icon: "local_shipping", tone: "brand", category: "Orders", title: "Supplier Delay: Global Pharma", body: "Shipment for PO-2026-00128 delayed by 48 hours.", time: "3 hours ago", unread: true },
  { id: "al-4", icon: "check_circle", tone: "success", category: "Orders", title: "Purchase Order Delivered", body: "PO-2026-00127 from MediLink Supplies has arrived.", time: "Yesterday", unread: false },
];
