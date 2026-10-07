import { formatDate, formatRand } from "@/lib/format";
import type { PoStatus } from "@/lib/data/orders";

export { formatRand, formatDate as longDay };

export const poTotal = (items: { quantity: number; unitCost: number }[]) => items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

export const STATUS_LABEL: Record<PoStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  delayed: "Delayed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_PILL: Record<PoStatus, string> = {
  pending: "border-[#B9CDEB] bg-[#DDE7F7] text-brand",
  approved: "border-[#A7E6D0] bg-[#DDF8EE] text-[#0B7A6B]",
  delayed: "border-[#F2D58F] bg-warning-bg text-warning",
  delivered: "border-[#BFE8CF] bg-success-bg text-success",
  cancelled: "border-[#D3DBE6] bg-[#EEF1F6] text-[#4A5C72]",
};
