import { STOCK_MOVEMENT } from "@/lib/mock-data";

/** Six plain CSS bars; heights are percentages of the busiest month. Every
 * month shares one light tint and only the latest month is solid brand
 * blue, so the colour points at "now" instead of alternating for show. */
export default function StockMovementChart() {
  const lastIndex = STOCK_MOVEMENT.heights.length - 1;

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-5 text-[18px] font-bold text-ink">Stock Movement</h2>
      <div className="grid min-h-[230px] flex-1 grid-cols-6 items-end gap-3 border-b border-border">
        {STOCK_MOVEMENT.heights.map((h, i) => (
          <div
            key={STOCK_MOVEMENT.labels[i]}
            title={`${STOCK_MOVEMENT.labels[i]}: ${h}% of peak`}
            className={`rounded-t-[6px] transition-colors ${
              i === lastIndex ? "bg-brand" : "bg-[#C7D6E8] hover:bg-[#A9C0DB]"
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-3 pt-2.5 text-center text-[12.5px] text-muted">
        {STOCK_MOVEMENT.labels.map((label, i) => (
          <span key={label} className={i === lastIndex ? "font-semibold text-ink" : undefined}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
