"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Icon from "../Icon";
import { useSearchQuery } from "@/lib/useSearchQuery";
import AlertsPanel from "./AlertsPanel";
import UserMenu from "./UserMenu";

type HeaderProps = {
  /** What this page's search box searches, e.g. "medicines, batches, suppliers". */
  searchPlaceholder: string;
};

/** Pages that filter their own list by `?q=`; searching from any other page lands on Medicine. */
const SEARCHABLE = ["/medicine", "/suppliers", "/orders", "/transactions", "/users", "/logs"];

export default function Header({ searchPlaceholder }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchQuery();
  const [value, setValue] = useState(current);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    const target = SEARCHABLE.includes(pathname) ? pathname : "/medicine";
    router.push(q ? `${target}?q=${encodeURIComponent(q)}` : target);
  }

  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center gap-5 border-b border-border-soft bg-white px-7 py-3">
      <form role="search" onSubmit={search} className="flex flex-1 justify-center">
        <div className="flex h-10 w-full max-w-[520px] items-center gap-2.5 rounded-[22px] border border-[#E1E7F0] bg-[#FBFCFE] px-4">
          <button type="submit" aria-label="Search" className="flex text-[#5B6472] hover:text-brand">
            <Icon name="search" size={19} />
          </button>
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
            className="w-full border-none bg-transparent text-[13.5px] text-ink placeholder:text-[#5B6472] focus:outline-none"
          />
        </div>
      </form>

      <AlertsPanel />
      <UserMenu />
    </header>
  );
}
