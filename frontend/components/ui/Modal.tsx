"use client";

import { useEffect } from "react";
import Icon from "../Icon";

/** A centred dialog over a dimmed backdrop. Closes on Escape and on a
 * backdrop click. `variant="drawer"` slides in from the right instead (used
 * by the Users page's Edit Roles panel). */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  variant = "dialog",
  children,
  footer,
  headerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  variant?: "dialog" | "drawer";
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const drawer = variant === "drawer";

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-[#0C2340]/40 backdrop-blur-[2px] ${
        drawer ? "justify-end" : "items-center justify-center p-4"
      }`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-full flex-col bg-white shadow-[0_24px_60px_rgba(16,35,64,.28)] ${
          drawer ? "h-full w-full max-w-[400px]" : "w-full max-w-[760px] rounded-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-soft px-6 py-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-[19px] font-bold text-ink">{title}</h2>
              {headerExtra}
            </div>
            {subtitle && <p className="text-[13.5px] text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-page">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-border-soft px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
