import Icon from "@/components/Icon";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import type { FeaturedSupplier } from "@/lib/data/suppliers";

const TONE: Record<FeaturedSupplier["tier"], BadgeTone> = { Primary: "success", Secondary: "neutral", Urgent: "danger" };
const TILE: Record<FeaturedSupplier["tier"], string> = {
  Primary: "bg-[#E4F1FC] text-brand",
  Secondary: "bg-[#E6F7EE] text-success",
  Urgent: "bg-[#FDECEA] text-danger",
};

export default function FeaturedSupplierCard({ name, tier, rating, orders, activeOrders }: FeaturedSupplier) {
  return (
    <article className="flex flex-col rounded-[14px] border border-border-soft bg-white p-5 shadow-[0_2px_10px_rgba(16,35,64,.04)]">
      <div className="flex items-start justify-between">
        <span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-xl ${TILE[tier]}`}>
          <Icon name="local_shipping" size={22} />
        </span>
        <Badge tone={TONE[tier]}>{tier}</Badge>
      </div>
      <h3 className="mt-4 text-[18px] font-bold text-ink">{name}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px]">
        <span className="text-warning-dot" aria-hidden="true"><Icon name="star" size={13} /></span>
        <span className="font-bold text-body">{rating.toFixed(1)}</span>
        <span className="text-muted">({orders} orders)</span>
      </p>
      <hr className="my-4 border-border-soft" />
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-body">Active Orders</span>
        <span className="text-[24px] font-bold text-brand">{String(activeOrders).padStart(2, "0")}</span>
      </div>
    </article>
  );
}
