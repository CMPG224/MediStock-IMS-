export type NavItem = {
  href: string;
  label: string;
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
  { href: "/assistant", label: "AI Assistant", icon: "smart_toy" },
  { href: "/users", label: "Users", icon: "group" },
  { href: "/logs", label: "Logs", icon: "receipt_long" },
  { href: "/settings", label: "Settings", icon: "settings" },
];
