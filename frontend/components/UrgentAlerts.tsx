"use client";

import { useState } from "react";
import Icon from "../Icon";
import { URGENT_ALERTS } from "@/lib/mock-data";

const TONE_BADGE = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
} as const;

/** The dashboard's urgent-alerts list. Severity lives in the icon badge
 * (red = act now, amber = act soon); the actions all share the brand
 * colour so the panel reads as one list, not three coloured banners.
 *
 * "use client" because alerts can be dismissed one by one or all at once
 * (local state only until the backend exists). */
export default function UrgentAlerts() {
  const [alerts, setAlerts] = useState(URGENT_ALERTS);

  return (
    <section className="flex flex-col rounded-[14px] border border-border-soft bg-white shadow-[0_2px_10px_rgba(16,35,64,.04)]">
      <div className="flex items-center justify-between gap-3 px-[22px] pb-3 pt-[22px]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[18px] font-bold text-ink">Urgent Alerts</h2>
          {alerts.length > 0 && (
            <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-danger px-1.5 text-[12px] font-bold tabular-nums text-white">
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length > 0 && (
          <button
            type="button"
            onClick={() => setAlerts([])}
            className="text-[13px] font-semibold text-muted hover:text-brand"
          >
            Clear all
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-[22px] pb-9 pt-7 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success">
            <Icon name="check_circle" size={22} />
          </span>
          <span className="text-[14px] font-semibold text-ink">No urgent alerts</span>
          <span className="max-w-[30ch] text-[12.5px] text-muted">
            Low stock, expiry and supplier issues will appear here as they happen.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border-soft px-[22px] pb-2">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex gap-3 py-3.5">
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${TONE_BADGE[alert.tone]}`}
              >
                <Icon name={alert.icon} size={18} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13.5px] font-semibold text-ink">{alert.title}</span>
                <span className="text-[12.5px] text-muted">{alert.body}</span>
                <button
                  type="button"
                  className="mt-1 self-start text-[12.5px] font-semibold text-brand hover:underline"
                >
                  {alert.actionLabel}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                aria-label={`Dismiss ${alert.title}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted opacity-60 hover:bg-page hover:text-ink hover:opacity-100 focus-visible:opacity-100"
              >
                <Icon name="close" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
