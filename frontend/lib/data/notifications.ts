import { supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/format";
import { must } from "./query";

export type Severity = "danger" | "warning" | "info" | "success";

export type Notification = {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  body: string;
  actionLabel: string;
  href: string;
  time: string;
  unread: boolean;
};

type Row = {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  body: string;
  action_label: string | null;
  read_by: string[];
  created_at: string;
};

const ICON: Record<Severity, string> = { danger: "warning", warning: "event_busy", info: "local_shipping", success: "check_circle" };
export const severityIcon = (s: Severity) => ICON[s];

function toNotification(r: Row, userId: string): Notification {
  const label = r.action_label ?? "";
  return {
    id: r.id,
    severity: r.severity,
    category: r.category || "General",
    title: r.title,
    body: r.body,
    actionLabel: label ? label.charAt(0) + label.slice(1).toLowerCase() : "View details",
    href: r.category === "Orders" ? "/orders" : /order/i.test(label) ? "/orders" : "/medicine",
    time: relativeTime(r.created_at),
    unread: !r.read_by.includes(userId),
  };
}

const COLUMNS = "id, severity, category, title, body, action_label, read_by, created_at";

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const rows = must(
    await supabase.from("notifications").select(COLUMNS).order("created_at", { ascending: false }).limit(10),
  ) as Row[];
  return rows.map((r) => toNotification(r, userId));
}

/** Unresolved danger/warning alerts the user hasn't dismissed. */
export async function fetchUrgentAlerts(userId: string): Promise<Notification[]> {
  const rows = must(
    await supabase
      .from("notifications")
      .select(COLUMNS)
      .in("severity", ["danger", "warning"])
      .eq("resolved", false)
      .not("read_by", "cs", `{${userId}}`)
      .order("created_at", { ascending: false }),
  ) as Row[];
  return rows.map((r) => toNotification(r, userId));
}

/** Marks the given notifications (or all of them) read for the current user. */
export async function markRead(ids?: string[]) {
  must(await supabase.rpc("mark_notifications_read", { p_ids: ids ?? null }));
}
