import Icon from "@/components/Icon";
import { CARD } from "@/components/ui/buttons";
import type { UserStats } from "@/lib/data/users";

export default function StatCards({ stats }: { stats?: UserStats }) {
  const STATS = [
    { label: "Admins", value: stats?.admins, icon: "verified_user", tile: "bg-brand text-white" },
    { label: "Pharmacists", value: stats?.pharmacists, icon: "medication", tile: "bg-[#C9F2DE] text-success" },
    { label: "Managers", value: stats?.managers, icon: "manage_accounts", tile: "bg-[#DDE7F7] text-brand" },
    { label: "Pending", value: stats?.pending, icon: "person_off", tile: "bg-[#FDE4E1] text-danger" },
  ];
  return (
    <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className={`${CARD} flex items-center gap-4 p-5`}>
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tile}`}>
            <Icon name={s.icon} size={21} />
          </span>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-muted">{s.label}</span>
            <span className="text-[24px] font-bold leading-tight text-ink">{s.value ?? "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
