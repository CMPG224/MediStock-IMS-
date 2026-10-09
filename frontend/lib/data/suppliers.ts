import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/format";
import { must, mustAffect, pageRange, searchTerm } from "./query";

export type SupplierStatus = "Active" | "Inactive";
export type SupplierFilter = "All" | SupplierStatus;

export type Supplier = {
  id: string;
  name: string;
  type: string;
  contact: string;
  phone: string;
  email: string;
  skuCount: number;
  /** ISO yyyy-mm-dd */
  lastDelivery: string | null;
  status: SupplierStatus;
};

export type FeaturedSupplier = {
  id: string;
  name: string;
  tier: "Primary" | "Secondary" | "Urgent";
  rating: number;
  orders: number;
  activeOrders: number;
};

type DirectoryRow = {
  id: string;
  name: string;
  supplier_type: string;
  featured_tier: "primary" | "secondary" | "urgent" | null;
  rating: number | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: "active" | "inactive";
  sku_count: number;
  total_orders: number;
  active_orders: number;
  last_delivery: string | null;
};

const TIER_ORDER = ["primary", "secondary", "urgent"];

export async function fetchSuppliers(filter: SupplierFilter, page: number, query = ""): Promise<{ rows: Supplier[]; total: number }> {
  const [from, to] = pageRange(page);
  let q = supabase.from("supplier_directory").select("*", { count: "exact" }).order("name");
  if (filter !== "All") q = q.eq("status", filter.toLowerCase());
  const term = searchTerm(query);
  if (term) q = q.or(["name", "contact_name"].map((c) => `${c}.ilike.*${term}*`).join(","));
  const { data, error, count } = await q.range(from, to);
  const rows = must({ data, error }) as DirectoryRow[];
  return {
    total: count ?? rows.length,
    rows: rows.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.supplier_type || "Supplier",
      contact: s.contact_name || "—",
      phone: s.contact_phone || "—",
      email: s.contact_email,
      skuCount: s.sku_count,
      lastDelivery: s.last_delivery ? isoDay(s.last_delivery) : null,
      status: s.status === "active" ? "Active" : "Inactive",
    })),
  };
}

export async function fetchFeaturedSuppliers(): Promise<FeaturedSupplier[]> {
  const rows = must(await supabase.from("supplier_directory").select("*").not("featured_tier", "is", null)) as DirectoryRow[];
  return rows
    .sort((a, b) => TIER_ORDER.indexOf(a.featured_tier!) - TIER_ORDER.indexOf(b.featured_tier!))
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      name: s.name,
      tier: (s.featured_tier!.charAt(0).toUpperCase() + s.featured_tier!.slice(1)) as FeaturedSupplier["tier"],
      rating: Number(s.rating ?? 0),
      orders: s.total_orders,
      activeOrders: s.active_orders,
    }));
}

export async function createSupplier(s: { name: string; type: string; contact: string; email: string; phone: string; status: SupplierStatus }) {
  must(
    await supabase.from("suppliers").insert({
      name: s.name,
      supplier_type: s.type,
      contact_name: s.contact,
      contact_email: s.email,
      contact_phone: s.phone,
      status: s.status.toLowerCase(),
    }),
  );
}

/** Administrator-only (RLS): anyone else matches zero rows and gets a permission error. */
export async function updateSupplier(
  id: string,
  s: { name: string; type: string; contact: string; email: string; phone: string; status: SupplierStatus },
) {
  mustAffect(
    await supabase
      .from("suppliers")
      .update({
        name: s.name,
        supplier_type: s.type,
        contact_name: s.contact,
        contact_email: s.email,
        contact_phone: s.phone,
        status: s.status.toLowerCase(),
      })
      .eq("id", id)
      .select("id"),
  );
}
