import { supabase } from "@/lib/supabase";
import { formatRandCompact, isoDay, monthLabel, relativeTime } from "@/lib/format";
import { must } from "./query";
import { TX_LABEL, toTxType, type TxStatus } from "./transactions";

export type KpiNoteTone = "up" | "neutral" | "warning" | "danger";
export type Kpi = { icon: string; label: string; value: string; note: string; noteTone: KpiNoteTone; critical?: boolean };

export async function fetchKpis(): Promise<Kpi[]> {
  const k = must(await supabase.from("dashboard_kpis").select("*").single()) as {
    total_medicines: number;
    total_suppliers: number;
    low_stock: number;
    expiring_soon: number;
    expired: number;
    total_value: number;
  };
  const n = (v: number) => Number(v).toLocaleString("en-US");
  return [
    { icon: "medication", label: "Total Medicines", value: n(k.total_medicines), note: "In catalogue", noteTone: "neutral" },
    { icon: "inventory_2", label: "Total Suppliers", value: n(k.total_suppliers), note: "Active", noteTone: "neutral" },
    {
      icon: "warning",
      label: "Low Stock",
      value: n(k.low_stock),
      note: k.low_stock > 0 ? "Critical" : "All above reorder point",
      noteTone: k.low_stock > 0 ? "danger" : "neutral",
      critical: k.low_stock > 0,
    },
    { icon: "event_busy", label: "Expiring Soon", value: n(k.expiring_soon), note: "Next 7 days", noteTone: k.expiring_soon > 0 ? "warning" : "neutral" },
    { icon: "block", label: "Expired", value: n(k.expired), note: k.expired > 0 ? "Requires action" : "None", noteTone: k.expired > 0 ? "danger" : "neutral" },
    { icon: "payments", label: "Total Value", value: formatRandCompact(Number(k.total_value)), note: "Stock on hand", noteTone: "neutral" },
  ];
}

export type RecentTx = { id: string; item: string; type: string; qty: string; qtyTone: "success" | "danger" | "neutral"; status: TxStatus; time: string };

export async function fetchRecentTransactions(): Promise<RecentTx[]> {
  const rows = must(
    await supabase
      .from("transaction_feed")
      .select("id, type, quantity, status, medicine_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ) as { id: string; type: string; quantity: number; status: string; medicine_name: string; created_at: string }[];
  return rows.map((r) => {
    const type = toTxType(r.type);
    const inbound = type === "in" || type === "return";
    return {
      id: r.id,
      item: r.medicine_name,
      type: TX_LABEL[type],
      qty: `${inbound ? "+" : "−"}${r.quantity} units`,
      qtyTone: r.status !== "completed" ? "neutral" : inbound ? "success" : "danger",
      status: r.status.toUpperCase() as TxStatus,
      time: relativeTime(r.created_at),
    };
  });
}

export type TrendRange = "1W" | "1M" | "1Y";
export type Trend = { labels: string[]; values: number[] };

/** Units on hand over time, from the daily inventory_snapshots rows. */
export async function fetchTrend(range: TrendRange): Promise<Trend> {
  const now = new Date();
  const since =
    range === "1Y"
      ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
      : new Date(Date.now() - ((range === "1W" ? 7 : 49) - 1) * 86_400_000);
  const rows = must(
    await supabase
      .from("inventory_snapshots")
      .select("snapshot_date, total_units")
      .gte("snapshot_date", isoDay(since))
      .order("snapshot_date"),
  ) as { snapshot_date: string; total_units: number }[];

  if (range === "1W") {
    const names = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return {
      labels: rows.map((r) => names[new Date(`${r.snapshot_date}T00:00:00`).getDay()]),
      values: rows.map((r) => r.total_units),
    };
  }
  // 1M: last snapshot of each week; 1Y: last snapshot of each month.
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const key =
      range === "1Y" ? r.snapshot_date.slice(0, 7) : String(Math.floor((Date.parse(r.snapshot_date) - since.getTime()) / (7 * 86_400_000)));
    buckets.set(key, r.total_units);
  }
  const keys = [...buckets.keys()];
  return {
    labels: keys.map((k, i) => (range === "1Y" ? monthLabel(`${k}-01`) : `W${i + 1}`)),
    values: keys.map((k) => buckets.get(k)!),
  };
}

export type Movement = { label: string; stockIn: number; stockOut: number };

/** Last six months of completed stock in/out. */
export async function fetchStockMovement(): Promise<Movement[]> {
  const rows = must(
    await supabase.from("stock_movement_monthly").select("month, stock_in, stock_out").order("month", { ascending: false }).limit(6),
  ) as { month: string; stock_in: number; stock_out: number }[];
  return rows.reverse().map((r) => ({
    label: monthLabel(r.month).charAt(0) + monthLabel(r.month).slice(1).toLowerCase(),
    stockIn: Number(r.stock_in),
    stockOut: Number(r.stock_out),
  }));
}
