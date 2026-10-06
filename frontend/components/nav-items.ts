// The primary nav, matching the original prototype: nine flat destinations,
// in the same order, with the same icons. (An earlier pass grouped these
// into four sections by Hick's Law; this rebuild goes back to the original
// design as-is instead.)
//
// Every destination now has a real page. (`comingSoon` is still supported by
// the Sidebar for any future placeholder, but nothing uses it today.)
export type NavItem = {
  href: string;
  label: string;
  /** Material Symbols ligature name. */
  icon: string;
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/medicine", label: "Medicine", icon: "medication" },
  { href: "/suppliers", label: "Suppliers", icon: "inventory_2" },
  { href: "/transactions", label: "Transactions", icon: "swap_horiz" },
  { href: "/orders", label: "Orders", icon: "shopping_cart" },
  { href: "/reports", label: "Reports", icon: "bar_chart" },
  { href: "/users", label: "Users", icon: "group" },
  { href: "/logs", label: "Logs", icon: "receipt_long" },
  { href: "/settings", label: "Settings", icon: "settings" },
];
