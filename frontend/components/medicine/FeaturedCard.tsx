import Icon from "@/components/Icon";
import Badge, { type BadgeTone } from "@/components/ui/Badge";

const TONE: Record<string, BadgeTone> = { "Well Stocked": "success", "In Stock": "neutral", "Low Stock": "danger", "Expiring Soon": "warning" };
const TILE: Record<string, string> = {
  "Well Stocked": "bg-[#E4F1FC] text-brand",
  "In Stock": "bg-[#E6F7EE] text-success",
  "Low Stock": "bg-[#FDECEA] text-danger",
  "Expiring Soon": "bg-warning-bg text-warning",
};

export default function FeaturedCard({
  name,
  category,
  stock,
  status,
  onOpen,
}: {
  name: string;
  category: string;
  stock: number;
  status: string;
  onOpen?: () => void;
}) {
  return (
    <article onClick={onOpen} className={`flex flex-col ${onOpen ? "cursor-pointer hover:border-brand/30" : ""} rounded-[14px] border border-border-soft bg-white p-5 shadow-[0_2px_10px_rgba(16,35,64,.04)]`}>
      <div className="flex items-start justify-between">
        <span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-xl ${TILE[status]}`}>
          <Icon name="medication" size={22} />
        </span>
        <Badge tone={TONE[status]}>{status}</Badge>
      </div>
      <h3 className="mt-4 text-[18px] font-bold text-ink">{name}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px]">
        <span className="text-warning-dot" aria-hidden="true"><Icon name="star" size={13} /></span>
        <span className="font-bold text-body">{category}</span>
        <span className="text-muted">({stock} units)</span>
      </p>
      <hr className="my-4 border-border-soft" />
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-body">Current Stock</span>
        <span className="text-[24px] font-bold text-brand">{stock}</span>
      </div>
    </article>
  );
}
