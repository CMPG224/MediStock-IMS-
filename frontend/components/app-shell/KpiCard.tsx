import Icon from "../Icon";
import type { KpiNoteTone } from "@/lib/data/dashboard";

const NOTE_COLOR: Record<KpiNoteTone, string> = {
  up: "text-success",
  neutral: "text-muted",
  warning: "text-warning",
  danger: "text-danger",
};

type KpiCardProps = {
  icon: string;
  label: string;
  value: string;
  note: string;
  noteTone: KpiNoteTone;
  critical?: boolean;
};

/** One cell of the dashboard's KPI strip; only `critical` cells are tinted. */
export default function KpiCard({ icon, label, value, note, noteTone, critical }: KpiCardProps) {
  return (
    <div className={`flex flex-col gap-3 px-5 py-4.5 ${critical ? "bg-danger-bg" : "bg-white"}`}>
      <dt className={`flex items-center gap-2 text-[13px] font-medium ${critical ? "text-danger" : "text-muted"}`}>
        <Icon name={icon} size={16} />
        {label}
      </dt>
      <dd className="flex flex-col gap-1.5">
        <span
          className={`text-[28px] font-bold leading-none tracking-[-.02em] tabular-nums ${critical ? "text-danger" : "text-ink"}`}
        >
          {value}
        </span>
        <span className={`flex items-center gap-1 text-[12.5px] font-semibold ${NOTE_COLOR[noteTone]}`}>
          {noteTone === "up" && <Icon name="trending_up" size={14} />}
          {note}
        </span>
      </dd>
    </div>
  );
}
