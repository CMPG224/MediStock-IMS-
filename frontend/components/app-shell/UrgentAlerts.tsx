"use client";

import Link from "next/link";
import Icon from "../Icon";
import { useProfile } from "./ProfileProvider";
import { fetchUrgentAlerts, markRead, severityIcon } from "@/lib/data/notifications";
import { useAsync } from "@/lib/useAsync";

const TONE_BADGE: Record<string, string> = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
};

/** Dashboard urgent-alerts list. Dismissing marks the alert read for this user only. */
export default function UrgentAlerts() {
  const { profile } = useProfile();
  const userId = profile?.id ?? "";
  const { data, reload } = useAsync(() => (userId ? fetchUrgentAlerts(userId) : Promise.resolve([])), [userId]);
  const alerts = data ?? [];

  const dismiss = (ids?: string[]) => markRead(ids).then(reload, reload);

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
            onClick={() => dismiss(alerts.map((a) => a.id))}
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
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${TONE_BADGE[alert.severity]}`}
              >
                <Icon name={severityIcon(alert.severity)} size={18} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13.5px] font-semibold text-ink">{alert.title}</span>
                <span className="text-[12.5px] text-muted">{alert.body}</span>
                <Link href={alert.href} className="mt-1 self-start text-[12.5px] font-semibold text-brand hover:underline">
                  {alert.actionLabel}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => dismiss([alert.id])}
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
