import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/format";
import { must, mustAffect, pageRange } from "./query";

export type PoStatus = "pending" | "approved" | "delayed" | "delivered" | "cancelled";
export type PoPriority = "Normal" | "High" | "Critical";

export type PoItem = { medicineId: string; medicine: string; quantity: number; unitCost: number };

export type PurchaseOrder = {
  id: string;
  /** "#PO-2026-00128" */
  number: string;
  supplierId: string;
  supplier: string;
  priority: PoPriority;
  /** ISO calendar day the order was raised. */
  date: string;
  expectedDate?: string;
  status: PoStatus;
  total: number;
  items: PoItem[];
};

export type OrderStats = { pending: number; approved: number; deliveredMtd: number; deliveredMtdValue: number; total: number };

type OrderRow = {
  id: string;
  po_number: string;
  supplier_id: string;
  status: PoStatus;
  priority: "normal" | "high" | "critical";
  created_at: string;
  expected_date: string | null;
  total_amount: number;
  suppliers: { name: string } | null;
  purchase_order_items: { medicine_id: string; quantity: number; unit_cost: number; medicines: { name: string } | null }[];
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function fetchOrders(page: number): Promise<{ rows: PurchaseOrder[]; total: number }> {
  const [from, to] = pageRange(page);
  const { data, error, count } = await supabase
    .from("purchase_orders")
    .select(
      "id, po_number, supplier_id, status, priority, created_at, expected_date, total_amount, suppliers(name), purchase_order_items(medicine_id, quantity, unit_cost, medicines(name))",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = must({ data, error }) as unknown as OrderRow[];
  return {
    total: count ?? rows.length,
    rows: rows.map((o) => ({
      id: o.id,
      number: `#${o.po_number}`,
      supplierId: o.supplier_id,
      supplier: o.suppliers?.name ?? "Unknown supplier",
      priority: capitalize(o.priority) as PoPriority,
      date: isoDay(o.created_at),
      expectedDate: o.expected_date ?? undefined,
      status: o.status,
      total: Number(o.total_amount),
      items: o.purchase_order_items.map((i) => ({
        medicineId: i.medicine_id,
        medicine: i.medicines?.name ?? "Unknown medicine",
        quantity: i.quantity,
        unitCost: Number(i.unit_cost),
      })),
    })),
  };
}

export async function fetchOrderStats(): Promise<OrderStats> {
  const s = must(await supabase.from("purchase_order_stats").select("*").single()) as {
    pending_approval: number;
    approved_orders: number;
    delivered_mtd: number;
    delivered_mtd_value: number;
    total_orders: number;
  };
  return {
    pending: s.pending_approval,
    approved: s.approved_orders,
    deliveredMtd: s.delivered_mtd,
    deliveredMtdValue: Number(s.delivered_mtd_value),
    total: s.total_orders,
  };
}

export type NewOrder = { supplierId: string; priority: PoPriority; expectedDate?: string; items: Omit<PoItem, "medicine">[] };

/** New orders start pending; the PO number and total are filled by triggers. */
export async function createOrder(o: NewOrder) {
  const { id } = must(
    await supabase
      .from("purchase_orders")
      .insert({ supplier_id: o.supplierId, priority: o.priority.toLowerCase(), expected_date: o.expectedDate ?? null, status: "pending" })
      .select("id")
      .single(),
  ) as { id: string };
  must(
    await supabase
      .from("purchase_order_items")
      .insert(o.items.map((i) => ({ purchase_order_id: id, medicine_id: i.medicineId, quantity: i.quantity, unit_cost: i.unitCost }))),
  );
}

export async function setOrderStatus(id: string, status: PoStatus) {
  mustAffect(await supabase.from("purchase_orders").update({ status }).eq("id", id).select("id"));
}
