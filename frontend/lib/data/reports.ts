import { supabase } from "@/lib/supabase";
import { monthLabel, relativeTime } from "@/lib/format";
import { must } from "./query";

export type Period = "current" | "previous";

/** Last 12 months of PO spend, split into the latest 6 and the 6 before. */
export async function fetchMonthlyExpenditure(): Promise<Record<Period, { labels: string[]; values: number[] }>> {
  const rows = must(await supabase.from("monthly_expenditure").select("month, total").order("month")) as { month: string; total: number }[];
  const series = (part: typeof rows) => ({ labels: part.map((r) => monthLabel(r.month)), values: part.map((r) => Number(r.total)) });
  return { previous: series(rows.slice(0, -6)), current: series(rows.slice(-6)) };
}

export type InventorySlice = { label: string; percent: number; color: string };

const SLICE_COLORS = ["#0B4C8C", "#0B7A54", "#4338CA", "#B5790F", "#B42318", "#0E7490"];

export async function fetchInventoryValue(): Promise<{ total: number; slices: InventorySlice[] }> {
  const rows = must(
    await supabase.from("inventory_value_by_category").select("category, value, pct").order("value", { ascending: false }),
  ) as { category: string; value: number; pct: number }[];
  return {
    total: rows.reduce((s, r) => s + Number(r.value), 0),
    slices: rows.map((r, i) => ({ label: r.category || "Uncategorised", percent: Math.round(Number(r.pct)), color: SLICE_COLORS[i % SLICE_COLORS.length] })),
  };
}

export type SupplierPerformance = { name: string; rate: number; tone: "success" | "brand" | "danger" };

export async function fetchSupplierPerformance(): Promise<SupplierPerformance[]> {
  const rows = must(
    await supabase.from("supplier_performance").select("supplier, fulfillment_rate").order("fulfillment_rate", { ascending: false }).limit(5),
  ) as { supplier: string; fulfillment_rate: number | null }[];
  return rows.map((r) => {
    const rate = r.fulfillment_rate ?? 0;
    return { name: r.supplier, rate, tone: rate >= 95 ? "success" : rate >= 80 ? "brand" : "danger" };
  });
}

export async function fetchStockTurnover(): Promise<{ labels: string[]; values: number[] }> {
  const rows = must(await supabase.from("stock_turnover_monthly").select("month, turnover").order("month")) as {
    month: string;
    turnover: number | null;
  }[];
  return { labels: rows.map((r) => monthLabel(r.month)), values: rows.map((r) => Number(r.turnover ?? 0)) };
}

export type ReportCard = { slug: string; title: string; description: string; footer: string; icon: string; tone: "danger" | "brand" | "success" };

const TONE: Record<string, ReportCard["tone"]> = { "low-stock-report": "danger", "inventory-valuation": "success" };

export async function fetchReports(): Promise<ReportCard[]> {
  const rows = must(await supabase.from("reports").select("slug, title, description, icon, schedule_label, last_run_at").order("title")) as {
    slug: string;
    title: string;
    description: string;
    icon: string;
    schedule_label: string | null;
    last_run_at: string | null;
  }[];
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description,
    icon: r.icon,
    footer: r.schedule_label ?? `Updated ${relativeTime(r.last_run_at).toLowerCase()}`,
    tone: TONE[r.slug] ?? "brand",
  }));
}
