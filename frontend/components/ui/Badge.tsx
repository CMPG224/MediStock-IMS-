export type BadgeTone = "success" | "danger" | "brand" | "warning" | "neutral";

const TONES: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  brand: "bg-[#DDE7F7] text-brand",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-[#EEF1F6] text-[#4A5C72]",
};

/** `upper` gives the letter-spaced uppercase style used for role badges. */
export default function Badge({
  tone = "neutral",
  upper = false,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  upper?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-bold ${
        upper ? "uppercase tracking-[.06em] text-[10.5px]" : ""
      } ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
