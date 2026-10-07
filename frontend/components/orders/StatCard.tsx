import Icon from "@/components/Icon";
import { CARD } from "@/components/ui/buttons";

export default function StatCard({
  label,
  value,
  caption,
  captionClass = "text-muted",
  captionIcon,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  caption: string;
  captionClass?: string;
  captionIcon?: string;
  icon: string;
  iconClass: string;
}) {
  return (
    <div className={`${CARD} flex items-start justify-between gap-4 p-6`}>
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">{label}</span>
        <span className="text-[36px] font-bold leading-none text-brand">{value}</span>
        <span className={`flex items-center gap-1 text-[12px] ${captionClass}`}>
          {captionIcon && <Icon name={captionIcon} size={13} />}
          {caption}
        </span>
      </div>
      <span aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon name={icon} size={26} />
      </span>
    </div>
  );
}
