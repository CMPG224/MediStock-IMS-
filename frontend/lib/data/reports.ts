import { supabase } from "@/lib/supabase";
import { formatDate, formatRand, isoDay, monthLabel, relativeTime } from "@/lib/format";
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

// ---------------------------------------------------------------------------
// Generated reports (the "Generate" panel on the Reports page)
// ---------------------------------------------------------------------------

export type ReportKind = "stock-summary" | "expiry-forecast" | "low-stock-report" | "inventory-valuation";

export type ReportResult = {
  title: string;
  /** e.g. the date range the report covers. */
  subtitle: string;
  head: string[];
  rows: (string | number)[][];
  /** Column indexes that hold numbers, for right alignment. */
  numeric: number[];
};

type MedicineRow = {
  id: string;
  name: string;
  batch_number: string | null;
  quantity_on_hand: number;
  reorder_point: number;
  unit_price: number;
  expiry_date: string | null;
};

const MEDICINE_COLUMNS = "id, name, batch_number, quantity_on_hand, reorder_point, unit_price, expiry_date";

async function allMedicines(): Promise<MedicineRow[]> {
  return must(await supabase.from("medicines").select(MEDICINE_COLUMNS).order("name")) as MedicineRow[];
}

const INBOUND = new Set(["stock_in", "return"]);

/** Local midnight at the start of an ISO day, as a UTC timestamp string. */
const dayStart = (day: string, plusDays = 0) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + plusDays);
  return d.toISOString();
};

/** Per medicine: stock in and out inside the range, and the closing stock at the end of its last day. */
export async function generateStockSummary(from: string, to: string): Promise<ReportResult> {
  const medicines = await allMedicines();
  const afterEnd = dayStart(to, 1);
  const tx: { medicine_id: string; type: string; quantity: number; created_at: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = must(
      await supabase
        .from("stock_transactions")
        .select("medicine_id, type, quantity, created_at")
        .eq("status", "completed")
        .gte("created_at", dayStart(from))
        .order("created_at")
        .range(offset, offset + 999),
    ) as typeof tx;
    tx.push(...page);
    if (page.length < 1000) break;
  }

  const rows = medicines
    .map((m) => {
      let stockIn = 0;
      let stockOut = 0;
      let after = 0; // net movement after the range, backed out of today's stock
      for (const t of tx) {
        if (t.medicine_id !== m.id) continue;
        const signed = INBOUND.has(t.type) ? t.quantity : -t.quantity;
        if (t.created_at >= afterEnd) after += signed;
        else if (signed > 0) stockIn += t.quantity;
        else stockOut += t.quantity;
      }
      return [m.name, stockIn, stockOut, m.quantity_on_hand - after] as (string | number)[];
    })
    // Only medicines that moved in the period, or that still hold stock then.
    .filter((r) => (r[1] as number) > 0 || (r[2] as number) > 0);

  return {
    title: "Stock Summary",
    subtitle: `${formatDate(from)} to ${formatDate(to)}`,
    head: ["Medicine", "Stock in", "Stock out", "Closing stock"],
    rows,
    numeric: [1, 2, 3],
  };
}

/** Medicines whose expiry date falls between today and `days` days from now. */
export async function generateExpiryForecast(days: number): Promise<ReportResult> {
  const today = isoDay(new Date());
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  const rows = (await allMedicines())
    .filter((m) => m.expiry_date && m.expiry_date >= today && m.expiry_date <= isoDay(limit))
    .sort((a, b) => a.expiry_date!.localeCompare(b.expiry_date!))
    .map((m) => {
      const left = Math.round((new Date(m.expiry_date!).getTime() - new Date(today).getTime()) / 86_400_000);
      return [m.name, m.batch_number ?? "—", formatDate(m.expiry_date), left, m.quantity_on_hand] as (string | number)[];
    });
  return {
    title: "Expiry Forecast",
    subtitle: `Expiring within ${days} days (as of ${formatDate(today)})`,
    head: ["Medicine", "Batch", "Expiry date", "Days left", "Units"],
    rows,
    numeric: [3, 4],
  };
}

export async function generateLowStock(): Promise<ReportResult> {
  const rows = (await allMedicines())
    .filter((m) => m.quantity_on_hand <= m.reorder_point)
    .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand)
    .map((m) => [m.name, m.quantity_on_hand, m.reorder_point, Math.max(0, m.reorder_point - m.quantity_on_hand)] as (string | number)[]);
  return {
    title: "Low Stock Report",
    subtitle: `Items at or below their reorder point (as of ${formatDate(isoDay(new Date()))})`,
    head: ["Medicine", "On hand", "Reorder at", "Short by"],
    rows,
    numeric: [1, 2, 3],
  };
}

export async function generateValuation(): Promise<ReportResult> {
  const meds = (await allMedicines()).filter((m) => m.quantity_on_hand > 0);
  const rows = meds.map((m) => [m.name, m.quantity_on_hand, formatRand(Number(m.unit_price)), formatRand(m.quantity_on_hand * Number(m.unit_price))] as (string | number)[]);
  if (rows.length) {
    const total = meds.reduce((s, m) => s + m.quantity_on_hand * Number(m.unit_price), 0);
    rows.push(["Total", "", "", formatRand(total)]);
  }
  return {
    title: "Inventory Valuation",
    subtitle: `Stock on hand at unit cost (as of ${formatDate(isoDay(new Date()))})`,
    head: ["Medicine", "Units", "Unit cost", "Value"],
    rows,
    numeric: [1, 2, 3],
  };
}
