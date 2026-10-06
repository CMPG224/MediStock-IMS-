"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { ALERTS } from "@/lib/mock-data";

const TONE_CLASSES: Record<string, string> = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  brand: "bg-brand-tint text-brand",
  success: "bg-success-bg text-success",
};

/**
 * The notification bell and its dropdown — matches the original prototype's
 * panel: a header with "Mark all as read", a scrollable list capped at a
 * fixed height, and a "View All Notifications" footer button rather than
 * an infinite dropdown.
 */
export default function AlertsPanel() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = ALERTS.filter((a) => a.unread && !readIds.includes(a.id)).length;

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
    <div ref={containerRef} className="relative flex p-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex text-body"
      >
        <Icon name="notifications" size={23} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-[1.5px] border-white bg-danger"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-11 z-20 w-[380px] max-w-[88vw] overflow-hidden rounded-[14px] border border-border-soft bg-white shadow-[0_16px_40px_rgba(16,35,64,.16)]"
        >
          <div className="flex items-center justify-between border-b border-border-soft px-[18px] py-4">
            <span className="text-[15px] font-bold text-ink">Notifications</span>
            <button
              type="button"
              onClick={() => setReadIds(ALERTS.map((a) => a.id))}
              className="text-[12.5px] font-bold text-brand"
            >
              Mark all as read
            </button>
          </div>

          <ul className="flex max-h-[380px] flex-col overflow-auto">
            {ALERTS.map((alert) => (
              <li key={alert.id} className="flex gap-3 border-b border-border-soft px-[18px] py-3.5 last:border-b-0">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[alert.tone]}`}
                >
                  <Icon name={alert.icon} size={17} />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-bold text-ink">{alert.title}</span>
                    <span className="shrink-0 rounded-full bg-page px-2 py-0.5 text-[11px] font-medium text-muted">
                      {alert.category}
                    </span>
                  </div>
                  <span className="text-[12.5px] text-body">{alert.body}</span>
                  <span className="text-[11.5px] text-muted">{alert.time}</span>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="h-[46px] w-full border-t border-border-soft bg-[#F8FAFD] text-[13.5px] font-bold text-brand hover:bg-[#F0F4FA]"
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
}
