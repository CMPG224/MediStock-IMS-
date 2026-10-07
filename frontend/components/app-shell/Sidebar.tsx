"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "../Icon";
import { NAV_ITEMS } from "./nav-items";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex h-screen flex-col bg-brand-tint transition-[width] duration-150 ${
        collapsed ? "w-[88px] px-4 py-5.5" : "w-[280px] px-5 py-5.5"
      }`}
    >
      <div className={`flex items-center gap-3 pb-[22px] ${collapsed ? "justify-center" : ""}`}>
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-brand">
          <Icon name="medical_services" size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col gap-0.5 overflow-hidden">
            <span className="truncate text-[17px] font-bold tracking-[-.01em] text-ink">MediStock IMS</span>
            <span className="truncate text-[11.5px] text-muted">Inventory Control</span>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-[3px]" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = !item.comingSoon && (pathname === item.href || pathname.startsWith(`${item.href}/`));

          if (item.comingSoon) {
            return (
              <span
                key={item.href}
                title={collapsed ? `${item.label} — coming soon` : undefined}
                aria-disabled="true"
                className={`flex h-[46px] w-full cursor-not-allowed items-center gap-[13px] rounded-full text-[14.5px] font-semibold text-muted/60 ${
                  collapsed ? "justify-center" : "px-4"
                }`}
              >
                <Icon name={item.icon} size={21} className="text-muted/60" />
                {!collapsed && (
                  <span className="flex flex-1 items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[.06em] text-muted/60">Soon</span>
                  </span>
                )}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex h-[46px] w-full items-center gap-[13px] rounded-full text-[14.5px] transition-colors ${
                collapsed ? "justify-center" : "px-4"
              } ${active ? "bg-brand font-bold text-white" : "font-semibold text-[#243B55] hover:bg-white/60"}`}
            >
              <Icon name={item.icon} size={21} className={active ? "text-white" : undefined} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-[3px] border-t border-[#D6E0F0] pt-[18px]">
        <button
          type="button"
          className={`flex h-11 w-full items-center gap-[13px] rounded-full text-[14.5px] font-semibold text-[#243B55] hover:bg-brand-tint ${
            collapsed ? "justify-center" : "px-4"
          }`}
        >
          <Icon name="help" size={20} className="text-[#4A5C72]" />
          {!collapsed && <span>Support</span>}
        </button>
        <button
          type="button"
          // useRequireAuth redirects to "/" once the session is gone.
          onClick={() => supabase.auth.signOut()}
          className={`flex h-11 w-full items-center gap-[13px] rounded-full text-[14.5px] font-semibold text-[#243B55] hover:bg-brand-tint ${
            collapsed ? "justify-center" : "px-4"
          }`}
        >
          <Icon name="logout" size={20} className="text-[#4A5C72]" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-11 w-full items-center gap-[13px] rounded-full text-[14.5px] font-semibold text-[#243B55] hover:bg-brand-tint ${
            collapsed ? "justify-center" : "px-4"
          }`}
        >
          <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={20} className="text-[#4A5C72]" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
