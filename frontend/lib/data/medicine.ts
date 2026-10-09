import { supabase } from "@/lib/supabase";
import { must, pageRange, searchTerm } from "./query";
import { recordTransaction } from "./transactions";

export type MedicineStatus = "In Stock" | "Low Stock" | "Expiring Soon" | "Expired";
export type FeaturedStatus = "Well Stocked" | "In Stock" | "Low Stock" | "Expiring Soon";
export type MedicineFilter = "All" | "In Stock" | "Low Stock" | "Expiring Soon";

export type Medicine = {
  id: string;
  name: string;
  category: string;
  batchNo: string;
  stock: number;
  reorderAt: number;
  /** ISO yyyy-mm-dd */
  expiry: string | null;
  status: MedicineStatus;
};

export type FeaturedMedicine = { id: string; name: string; category: string; stock: number; status: FeaturedStatus };

export const DEFAULT_CATEGORIES = ["Antibiotics", "Analgesics", "Chronic Care", "Cardiology", "Emergency", "Vaccines"];

export const TEMPERATURE_OPTIONS = [
  { value: "room_temp", label: "Room Temp (15°C – 25°C)" },
  { value: "refrigerated", label: "Refrigerated (2°C – 8°C)" },
  { value: "frozen", label: "Frozen (−20°C)" },
] as const;

type InventoryRow = {
  id: string;
  name: string;
  category: string;
  batch_number: string | null;
  quantity_on_hand: number;
  reorder_point: number;
  expiry_date: string | null;
  days_to_expiry: number | null;
  stock_status: "low_stock" | "expiring_soon" | "well_stocked" | "in_stock";
};

function listStatus(r: InventoryRow): MedicineStatus {
  if (r.stock_status === "low_stock") return "Low Stock";
  if (r.stock_status === "expiring_soon") return r.days_to_expiry !== null && r.days_to_expiry < 0 ? "Expired" : "Expiring Soon";
  return "In Stock";
}

const FEATURED_STATUS: Record<InventoryRow["stock_status"], FeaturedStatus> = {
  low_stock: "Low Stock",
  expiring_soon: "Expiring Soon",
  well_stocked: "Well Stocked",
  in_stock: "In Stock",
};

const FILTER_STATUSES: Record<Exclude<MedicineFilter, "All">, string[]> = {
  "In Stock": ["in_stock", "well_stocked"],
  "Low Stock": ["low_stock"],
  "Expiring Soon": ["expiring_soon"],
};

const COLUMNS = "id, name, category, batch_number, quantity_on_hand, reorder_point, expiry_date, days_to_expiry, stock_status";

export async function fetchMedicines(filter: MedicineFilter, page: number, query = ""): Promise<{ rows: Medicine[]; total: number }> {
  const [from, to] = pageRange(page);
  let q = supabase.from("medicine_inventory").select(COLUMNS, { count: "exact" }).order("name");
  if (filter !== "All") q = q.in("stock_status", FILTER_STATUSES[filter]);
  const term = searchTerm(query);
  if (term) q = q.or(["name", "category", "batch_number"].map((c) => `${c}.ilike.*${term}*`).join(","));
  const { data, error, count } = await q.range(from, to);
  const rows = must({ data, error }) as InventoryRow[];
  return {
    total: count ?? rows.length,
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      batchNo: r.batch_number ?? "—",
      stock: r.quantity_on_hand,
      reorderAt: r.reorder_point,
      expiry: r.expiry_date,
      status: listStatus(r),
    })),
  };
}

/** The three most recently added medicines. */
export async function fetchFeaturedMedicines(): Promise<FeaturedMedicine[]> {
  const rows = must(
    await supabase.from("medicine_inventory").select(COLUMNS).order("created_at", { ascending: false }).limit(3),
  ) as InventoryRow[];
  return rows.map((r) => ({ id: r.id, name: r.name, category: r.category, stock: r.quantity_on_hand, status: FEATURED_STATUS[r.stock_status] }));
}

export async function fetchCategories(): Promise<string[]> {
  const rows = must(await supabase.from("medicines").select("category")) as { category: string }[];
  return [...new Set([...DEFAULT_CATEGORIES, ...rows.map((r) => r.category).filter(Boolean)])].sort();
}

export type SupplierOption = { id: string; name: string };

export async function fetchSupplierOptions(): Promise<SupplierOption[]> {
  return must(await supabase.from("suppliers").select("id, name").eq("status", "active").order("name")) as SupplierOption[];
}

export type NewMedicine = {
  name: string;
  genericName: string;
  category: string;
  supplierId: string;
  batchNo: string;
  barcode?: string;
  storageLocation: string;
  temperature: string;
  expiry?: string;
  quantity: number;
  reorderAt: number;
  unitCost: number;
};

function makeSku(name: string): string {
  const stem = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 12);
  return `MED-${stem}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

/**
 * Creates the catalogue row at zero stock, then books the opening quantity
 * as a stock-in so it shows up in the transaction history like any delivery.
 */
export async function createMedicine(m: NewMedicine) {
  const { id } = must(
    await supabase
      .from("medicines")
      .insert({
        name: m.name,
        generic_name: m.genericName,
        sku: makeSku(m.name),
        category: m.category,
        supplier_id: m.supplierId,
        batch_number: m.batchNo,
        barcode: m.barcode || null,
        storage_location: m.storageLocation,
        temperature_condition: m.temperature,
        expiry_date: m.expiry || null,
        reorder_point: m.reorderAt,
        unit_price: m.unitCost,
      })
      .select("id")
      .single(),
  ) as { id: string };
  if (m.quantity > 0) {
    await recordTransaction({ medicineId: id, type: "in", quantity: m.quantity, batch: m.batchNo, note: "Opening stock." });
  }
}
