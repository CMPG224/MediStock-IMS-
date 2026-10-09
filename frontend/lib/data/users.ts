import { supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/format";
import { must, mustAffect, pageRange, searchTerm } from "./query";

export type UserRole = "administrator" | "pharmacist" | "manager" | "nurse" | "staff";
export type Permission = "inventory_overrides" | "financial_reporting" | "user_auditing";

export const ROLE_LABEL: Record<UserRole, string> = {
  administrator: "Admin",
  pharmacist: "Pharmacist",
  manager: "Manager",
  nurse: "Nurse",
  staff: "Staff",
};

export const ROLE_TITLE: Record<UserRole, string> = {
  administrator: "Administrator",
  pharmacist: "Pharmacist",
  manager: "Inventory Manager",
  nurse: "Nurse",
  staff: "Staff",
};

export const ROLE_OPTIONS: { value: UserRole; title: string; description: string }[] = [
  { value: "administrator", title: "Administrator", description: "Full system access, user management, and configuration." },
  { value: "pharmacist", title: "Pharmacist", description: "Access to inventory, dispense tools, and clinical reports." },
  { value: "manager", title: "Inventory Manager", description: "Purchase orders, supplier management, and stock auditing." },
];

export const PERMISSION_OPTIONS: { value: Permission; title: string; description: string }[] = [
  { value: "inventory_overrides", title: "Inventory Overrides", description: "Allow manual adjustment of stock counts" },
  { value: "financial_reporting", title: "Financial Reporting", description: "Access to cost of goods and profit analysis" },
  { value: "user_auditing", title: "User Auditing", description: "View access logs for all users in the system" },
];

export type Profile = { id: string; fullName: string; email: string; role: UserRole; isActive: boolean };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLogin: string;
  permissions: Permission[];
};

export type UserStats = { admins: number; pharmacists: number; managers: number; pending: number; totalActive: number };

type ProfileRecord = {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  permissions: Permission[];
};

export async function fetchProfile(userId: string): Promise<Profile> {
  const row = must(
    await supabase.from("profiles").select("id, full_name, email, role, is_active").eq("id", userId).single(),
  ) as Pick<ProfileRecord, "id" | "full_name" | "email" | "role" | "is_active">;
  return { id: row.id, fullName: row.full_name || "Unnamed user", email: row.email ?? "", role: row.role, isActive: row.is_active };
}

export async function updateOwnName(userId: string, fullName: string) {
  mustAffect(await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId).select("id"));
}

/**
 * Gate for every sign-in path. A deactivated account is refused (and signed
 * back out); an invited account that has never signed in is "pending" rather
 * than deactivated, and is activated by touch_last_login on first sign-in.
 */
export async function enforceActiveAccount(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase.from("profiles").select("is_active, last_login_at").eq("id", auth.user.id).maybeSingle();
  const allowed = !!data && (data.is_active || data.last_login_at === null);
  if (!allowed) await supabase.auth.signOut();
  return allowed;
}

export const DEACTIVATED_MESSAGE = "This account has been deactivated. Contact your administrator.";

/** Stamps last_login_at and writes the "User signed in" log line. */
export async function recordSignIn() {
  await supabase.rpc("touch_last_login");
}

/** Profiles are RLS-scoped: administrators get everyone, others only themselves. */
export async function fetchUsers(page: number, query = ""): Promise<{ rows: UserRow[]; total: number }> {
  const [from, to] = pageRange(page);
  let q = supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, last_login_at, permissions", { count: "exact" })
    .order("full_name");
  const term = searchTerm(query);
  if (term) q = q.or(["full_name", "email"].map((c) => `${c}.ilike.*${term}*`).join(","));
  const { data, error, count } = await q.range(from, to);
  const rows = must({ data, error }) as ProfileRecord[];
  return {
    total: count ?? rows.length,
    rows: rows.map((p) => ({
      id: p.id,
      name: p.full_name || "Unnamed user",
      email: p.email ?? "",
      role: p.role,
      active: p.is_active,
      lastLogin: relativeTime(p.last_login_at),
      permissions: p.permissions ?? [],
    })),
  };
}

export async function fetchUserStats(): Promise<UserStats> {
  const s = must(await supabase.from("user_stats").select("*").single()) as {
    admins: number;
    pharmacists: number;
    managers: number;
    pending: number;
    total_active: number;
  };
  return { admins: s.admins, pharmacists: s.pharmacists, managers: s.managers, pending: s.pending, totalActive: s.total_active };
}

// Non-administrators' changes to these columns are silently reverted by a
// trigger, so the row is re-read to report what actually stuck.
async function updateGuarded(id: string, patch: Record<string, unknown>, check: (row: ProfileRecord) => boolean) {
  const [row] = mustAffect(
    await supabase.from("profiles").update(patch).eq("id", id).select("id, role, is_active, permissions"),
  ) as ProfileRecord[];
  if (!check(row)) throw new Error("Only administrators can change roles, permissions or account status.");
}

export function setUserActive(id: string, active: boolean) {
  return updateGuarded(id, { is_active: active }, (r) => r.is_active === active);
}

export function setUserRole(id: string, role: UserRole, permissions: Permission[]) {
  return updateGuarded(
    id,
    { role, permissions },
    (r) => r.role === role && [...r.permissions].sort().join() === [...permissions].sort().join(),
  );
}

/** Sends an invite email via the invite-user Edge Function (administrators only). */
export async function inviteUser(input: { fullName: string; email: string; role: UserRole }) {
  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: { full_name: input.fullName, email: input.email, role: input.role, redirect_to: `${window.location.origin}/` },
  });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    if (body?.error) throw new Error(body.error);
    // No response body means the request never reached the function.
    throw new Error(
      error.name === "FunctionsHttpError"
        ? "The invite service returned an error. Check the invite-user function logs in Supabase."
        : "Could not reach the invite service. Make sure the invite-user Edge Function is deployed.",
    );
  }
  return data as { id: string };
}
