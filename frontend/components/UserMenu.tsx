"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { currentUser } from "@/lib/mock-data";

const MENU_ITEMS = [
  { icon: "person", label: "My Profile" },
  { icon: "settings", label: "Settings" },
  { icon: "receipt_long", label: "Activity Logs" },
  { icon: "help", label: "Support Center" },
] as const;

/** The avatar + name in the header, and its dropdown — matches the
 * original prototype: a bordered circular avatar, name/role stacked to its
 * left, a chevron, and a menu with account info at the top and Sign Out
 * split off at the bottom in red. */
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex flex-none items-center gap-[11px] border-l border-border-soft pl-5 hover:opacity-85"
      >
        <span className="hidden flex-col items-end gap-px sm:flex">
          <span className="whitespace-nowrap text-[13.5px] font-bold text-ink">{currentUser.name}</span>
          <span className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[.07em] text-[#5B6472]">
            {currentUser.role}
          </span>
        </span>
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand bg-brand-tint">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/avatar-tr-mokwena.png" alt="" className="h-full w-full object-cover" />
        </span>
        <Icon name="expand_more" size={18} className="hidden text-[#5B6472] sm:inline-block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[52px] z-20 w-[240px] overflow-hidden rounded-xl border border-border-soft bg-white shadow-[0_16px_40px_rgba(16,35,64,.16)]"
        >
          <div className="flex flex-col gap-0.5 border-b border-border-soft px-4 py-3.5">
            <span className="text-[14px] font-bold text-ink">{currentUser.name}</span>
            <span className="text-[12px] text-[#5B6472]">tr.mokwena@medistock.io</span>
          </div>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="flex h-[42px] w-full items-center gap-[11px] px-4 text-left text-[13.5px] font-semibold text-[#243B55] hover:bg-page"
            >
              <Icon name={item.icon} size={19} className="text-[#4A5C72]" />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="flex h-[42px] w-full items-center gap-[11px] border-t border-border-soft px-4 text-left text-[13.5px] font-semibold text-danger hover:bg-danger-bg"
          >
            <Icon name="logout" size={19} className="text-danger" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
