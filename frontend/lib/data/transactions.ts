import { supabase } from "@/lib/supabase";
import { clock, isoDay } from "@/lib/format";
import { must, pageRange, searchTerm } from "./query";

export type TxType = "in" | "out" | "damaged" | "return" | "expired";
export type TxStatus = "COMPLETED" | "PENDING" | "REJECTED";

const DB_TYPE: Record<TxType, string> = { in: "stock_in", out: "stock_out", damaged: "damaged", return: "return", expired: "expired" };
export const toTxType = (t: string) => (t === "stock_in" ? "in" : t === "stock_out" ? "out" : t) as TxType;

export const TX_LABEL: Record<TxType, string> = { in: "Stock In", out: "Stock Out", damaged: "Damaged", return: "Return", expired: "Expired" };

export type Transaction = {
  id: string;
  /** "#TX-94821" */
  reference: string;
  /** Local calendar day, "2026-10-24". */
  day: string;
  /** Local "HH:mm". */
  time: string;
  item: string;
  type: TxType;
  /** Signed: positive = stock added, negative = stock removed. */
  quantity: number;
  status: TxStatus;
  description: string;
  actor: string;
  actorIsSystem: boolean;
};

type FeedRow = {
  id: string;
  reference: string | null;
  type: string;
  quantity: number;
  status: string;
  medicine_name: string;
  batch_number: string | null;
  department: string;
  note: string;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
};

const VERB: Record<TxType, string> = {
  in: "Received",
  out: "Dispensed",
  damaged: "Recorded as damaged:",
  return: "Returned",
  expired: "Flagged as expired:",
};

function toTransaction(r: FeedRow): Transaction {
  const type = toTxType(r.type);
  const inbound = type === "in" || type === "return";
  const parts = [`${VERB[type]} ${r.quantity} units of ${r.medicine_name}`];
  if (r.department) parts[0] += type === "out" ? ` to ${r.department}` : ` (${r.department})`;
  if (r.batch_number) parts[0] += ` (Ref: ${r.batch_number})`;
  return {
    id: r.id,
    reference: r.reference ? `#${r.reference}` : "—",
    day: isoDay(r.created_at),
    time: clock(r.created_at),
    item: r.medicine_name,
    type,
    quantity: inbound ? r.quantity : -r.quantity,
    status: r.status.toUpperCase() as TxStatus,
    description: `${parts[0]}.${r.note ? ` ${r.note}` : ""}`,
    actor: r.performed_by ? r.performed_by_name ?? "Unknown user" : "System Automated",
    actorIsSystem: !r.performed_by,
  };
}

const COLUMNS = "id, reference, type, quantity, status, medicine_name, batch_number, department, note, performed_by, performed_by_name, created_at";

export async function fetchTransactions(filter: "all" | TxType, page: number, query = ""): Promise<{ rows: Transaction[]; total: number }> {
  const [from, to] = pageRange(page);
  let q = supabase.from("transaction_feed").select(COLUMNS, { count: "exact" }).order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("type", DB_TYPE[filter]);
  const term = searchTerm(query);
  if (term) q = q.or(["reference", "medicine_name", "batch_number"].map((c) => `${c}.ilike.*${term}*`).join(","));
  const { data, error, count } = await q.range(from, to);
  const rows = must({ data, error }) as FeedRow[];
  return { rows: rows.map(toTransaction), total: count ?? rows.length };
}

export async function fetchTimeline(): Promise<Transaction[]> {
  const rows = must(
    await supabase.from("transaction_feed").select(COLUMNS).order("created_at", { ascending: false }).limit(5),
  ) as FeedRow[];
  return rows.map(toTransaction);
}

export type MedicineOption = { id: string; name: string; unitPrice: number; onHand: number };

export async function fetchMedicineOptions(): Promise<MedicineOption[]> {
  const rows = must(await supabase.from("medicines").select("id, name, unit_price, quantity_on_hand").order("name")) as {
    id: string;
    name: string;
    unit_price: number;
    quantity_on_hand: number;
  }[];
  return rows.map((r) => ({ id: r.id, name: r.name, unitPrice: Number(r.unit_price), onHand: r.quantity_on_hand }));
}

/** performed_by defaults to the signed-in user; the trigger moves stock. */
export async function recordTransaction(input: { medicineId: string; type: TxType; quantity: number; batch?: string; note?: string }) {
  must(
    await supabase.from("stock_transactions").insert({
      medicine_id: input.medicineId,
      type: DB_TYPE[input.type],
      quantity: input.quantity,
      batch_number: input.batch || null,
      note: input.note ?? "",
    }),
  );
}
