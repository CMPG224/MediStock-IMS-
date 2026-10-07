import { shortDay } from "@/lib/format";
import type { Transaction, TxType } from "@/lib/data/transactions";

export { shortDay };

export function formatQty(q: number): string {
  return `${q < 0 ? "−" : "+"}${Math.abs(q).toLocaleString("en-ZA")}`;
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Time label for the timeline: the clock time on the newest day, "Yesterday"
 * for the day before, otherwise the short date. */
export function timelineWhen(tx: Transaction, newestDay: string): string {
  const diff = dayNumber(newestDay) - dayNumber(tx.day);
  if (diff <= 0) return tx.time;
  if (diff === 1) return "Yesterday";
  return shortDay(tx.day);
}

export const TYPE_LABEL: Record<TxType, string> = {
  in: "In",
  out: "Out",
  expired: "Expired",
  return: "Return",
  damaged: "Damaged",
};

export const TYPE_PILL: Record<TxType, string> = {
  in: "bg-success-bg text-success",
  out: "bg-danger-bg text-danger",
  expired: "bg-warning-bg text-warning",
  return: "bg-[#EEF1F6] text-[#4A5C72]",
  damaged: "bg-[#FDEBDD] text-[#B4460F]",
};

export const TYPE_DOT: Record<TxType, string> = {
  in: "bg-success",
  out: "bg-danger",
  expired: "bg-warning-dot",
  return: "bg-[#98A2B3]",
  damaged: "bg-[#E8590C]",
};

export const DEFAULT_TITLE: Record<TxType, string> = {
  in: "Stock In Confirmed",
  out: "Stock Out",
  expired: "Batch Expired",
  return: "Item Returned",
  damaged: "Damaged Stock",
};

export function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
