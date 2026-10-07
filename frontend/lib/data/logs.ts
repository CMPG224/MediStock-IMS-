import { supabase } from "@/lib/supabase";
import { fullTimestamp } from "@/lib/format";
import { must, pageRange, searchTerm } from "./query";
import { ROLE_TITLE, type UserRole } from "./users";

export type LogCategory = "Inventory" | "Orders" | "Users" | "Security" | "System";
export type LogResult = "Success" | "Warning" | "Failed";

export const LOG_CATEGORIES: ("All" | LogCategory)[] = ["All", "Inventory", "Orders", "Users", "Security", "System"];

export type LogEntry = {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  category: LogCategory;
  entity: string;
  ip: string;
  result: LogResult;
};

type LogRow = {
  id: string;
  user_id: string | null;
  user_label: string;
  category: string;
  action: string;
  entity_type: string | null;
  entity_label: string | null;
  ip_address: string | null;
  result: string;
  created_at: string;
  profiles: { role: UserRole } | null;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Administrators see every event; everyone else sees only their own (RLS). */
export async function fetchLogs(category: "All" | LogCategory, query: string, page: number): Promise<{ rows: LogEntry[]; total: number }> {
  const [from, to] = pageRange(page);
  let q = supabase
    .from("activity_logs")
    .select("id, user_id, user_label, category, action, entity_type, entity_label, ip_address, result, created_at, profiles(role)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (category !== "All") q = q.eq("category", category.toLowerCase());
  const term = searchTerm(query);
  if (term) {
    q = q.or(["user_label", "action", "entity_type", "entity_label", "result"].map((c) => `${c}.ilike.*${term}*`).join(","));
  }
  const { data, error, count } = await q.range(from, to);
  const rows = must({ data, error }) as unknown as LogRow[];
  return {
    total: count ?? rows.length,
    rows: rows.map((l) => ({
      id: l.id,
      timestamp: fullTimestamp(l.created_at),
      user: l.user_label || "System",
      role: l.profiles ? ROLE_TITLE[l.profiles.role] : l.user_id ? "—" : "Automated",
      action: l.action,
      category: capitalize(l.category) as LogCategory,
      entity: [l.entity_type ? capitalize(l.entity_type) : "", l.entity_label].filter(Boolean).join(" · ") || "—",
      ip: l.ip_address ?? "—",
      result: capitalize(l.result) as LogResult,
    })),
  };
}
