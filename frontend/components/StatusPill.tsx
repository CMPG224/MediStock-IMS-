import type { TxStatus } from "@/lib/mock-data";

const STATUS_STYLE: Record<TxStatus, string> = {
  COMPLETED: "bg-success-bg text-success",
  PENDING: "bg-brand-tint text-brand",
  REJECTED: "bg-danger-bg text-danger",
};

const STATUS_LABEL: Record<TxStatus, string> = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  REJECTED: "Rejected",
};

/** Status chip for the transactions table. Sentence case reads faster in a
 * dense table than letter-spaced capitals, and the tint carries the state. */
export default function StatusPill({ status }: { status: TxStatus }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.75 text-[12px] font-semibold ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
