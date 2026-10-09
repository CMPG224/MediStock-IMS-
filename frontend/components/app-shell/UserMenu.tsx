"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import Link from "next/link";
import { useProfile } from "./ProfileProvider";
import { initials } from "@/lib/format";
import { ROLE_TITLE } from "@/lib/data/users";
import { supabase } from "@/lib/supabase";

const MENU_ITEMS = [
  { icon: "person", label: "My Profile", href: "/settings" },
  { icon: "settings", label: "Settings", href: "/settings" },
  { icon: "receipt_long", label: "Activity Logs", href: "/logs" },
  { icon: "help", label: "Support Center", href: "/legal/support" },
] as const;

/** Header avatar and account dropdown. */
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();
  const name = profile?.fullName ?? "";

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
          <span className="whitespace-nowrap text-[13.5px] font-bold text-ink">{name}</span>
          <span className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[.07em] text-[#5B6472]">
            {profile ? ROLE_TITLE[profile.role] : ""}
          </span>
        </span>
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand bg-brand-tint text-[13px] font-bold text-brand">
          {name ? initials(name) : ""}
        </span>
        <Icon name="expand_more" size={18} className="hidden text-[#5B6472] sm:inline-block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[52px] z-20 w-[240px] overflow-hidden rounded-xl border border-border-soft bg-white shadow-[0_16px_40px_rgba(16,35,64,.16)]"
        >
          <div className="flex flex-col gap-0.5 border-b border-border-soft px-4 py-3.5">
            <span className="text-[14px] font-bold text-ink">{name}</span>
            <span className="text-[12px] text-[#5B6472]">{profile?.email}</span>
          </div>
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-[42px] w-full items-center gap-[11px] px-4 text-left text-[13.5px] font-semibold text-[#243B55] hover:bg-page"
            >
              <Icon name={item.icon} size={19} className="text-[#4A5C72]" />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            // useRequireAuth redirects to "/login" once the session is gone.
            onClick={() => supabase.auth.signOut()}
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
