const DOT: Record<string, string> = {
  success: "bg-success text-success",
  danger: "bg-danger text-danger",
  warning: "bg-warning-dot text-warning",
  muted: "bg-[#98A2B3] text-[#667085]",
  brand: "bg-brand text-brand",
};

export default function StatusDot({ tone, children }: { tone: keyof typeof DOT; children: React.ReactNode }) {
  const [bg, text] = DOT[tone].split(" ");
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] font-bold ${text}`}>
      <span className={`h-2 w-2 rounded-full ${bg}`} aria-hidden="true" />
      {children}
    </span>
  );
}
