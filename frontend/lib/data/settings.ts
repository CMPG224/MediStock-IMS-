import { supabase } from "@/lib/supabase";
import { must } from "./query";

export type Theme = "light" | "dark" | "system";

export type SettingsState = {
  emailAlerts: boolean;
  lowStockAlerts: boolean;
  expiryNotifications: boolean;
  weeklySummary: boolean;
  twoFactor: boolean;
  theme: Theme;
  accent: string;
};

export const DEFAULT_SETTINGS: SettingsState = {
  emailAlerts: true,
  lowStockAlerts: true,
  expiryNotifications: true,
  weeklySummary: false,
  twoFactor: false,
  theme: "light",
  accent: "#0B4C8C",
};

export const NOTIFICATION_ITEMS: { key: keyof SettingsState; title: string; description: string }[] = [
  { key: "emailAlerts", title: "Email Alerts", description: "Get notified by email for critical events" },
  { key: "lowStockAlerts", title: "Low Stock Alerts", description: "Alert when inventory falls below reorder point" },
  { key: "expiryNotifications", title: "Expiry Notifications", description: "Warn before medicines approach expiry" },
  { key: "weeklySummary", title: "Weekly Summary Reports", description: "Receive a weekly inventory digest email" },
];

export const ACCENTS: { name: string; value: string }[] = [
  { name: "Blue", value: "#0B4C8C" },
  { name: "Green", value: "#0B7A54" },
  { name: "Red", value: "#B42318" },
  { name: "Purple", value: "#6D28D9" },
  { name: "Orange", value: "#C2620A" },
];

const COLUMN: Record<keyof SettingsState, string> = {
  emailAlerts: "email_alerts",
  lowStockAlerts: "low_stock_alerts",
  expiryNotifications: "expiry_notifications",
  weeklySummary: "weekly_summary",
  twoFactor: "two_factor_enabled",
  theme: "theme",
  accent: "accent_color",
};

export async function fetchSettings(userId: string): Promise<SettingsState> {
  const row = must(await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle()) as Record<string, unknown> | null;
  if (!row) return DEFAULT_SETTINGS;
  return Object.fromEntries(Object.entries(COLUMN).map(([key, col]) => [key, row[col]])) as unknown as SettingsState;
}

/** The row is created at sign-up; upsert covers accounts made before that. */
export async function saveSetting<K extends keyof SettingsState>(userId: string, key: K, value: SettingsState[K]) {
  must(await supabase.from("user_settings").upsert({ user_id: userId, [COLUMN[key]]: value }));
}
