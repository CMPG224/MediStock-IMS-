"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { BTN_SMALL_OUTLINE } from "@/components/ui/buttons";

/** Filter dropdown (single choice) + Export button for list-card headers. */
export default function FilterMenu<T extends string>({
  options,
  value,
  onChange,
  label = "Status",
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = options[0] !== value;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative" ref={ref}>
        <button
          type="button"
          className={`${BTN_SMALL_OUTLINE} ${active ? "!border-brand !text-brand" : ""}`}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="filter_list" size={15} /> Filter{active ? `: ${value}` : ""}
        </button>
        {open && (
          <div
            id={menuId}
            role="group"
            aria-label={`Filter by ${label.toLowerCase()}`}
            className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border-soft bg-white p-1.5 shadow-[0_12px_32px_rgba(16,35,64,.16)]"
          >
            <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[.05em] text-muted">{label}</p>
            {options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={o === value}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13.5px] font-medium hover:bg-page ${
                  o === value ? "text-brand" : "text-body"
                }`}
              >
                {o}
                {o === value && <Icon name="check" size={15} />}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className={BTN_SMALL_OUTLINE}>
        <Icon name="download" size={15} /> Export
      </button>
    </div>
  );
}
