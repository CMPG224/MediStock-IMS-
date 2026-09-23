import { STOCK_MOVEMENT } from "@/lib/mock-data";

//Bargraph chart for stock movement
export default function StockMovementChart() {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-5 text-[18px] font-bold text-ink">Stock Movement</h2>
      <div className="grid min-h-[230px] flex-1 grid-cols-6 items-end gap-3.5">
        {STOCK_MOVEMENT.heights.map((h, i) => (
          <div
            key={i}
            className="rounded-t-[6px]"
            style={{ height: `${h}%`, background: i % 2 === 1 ? "#0B4C8C" : "#C7D6E8" }}
          />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-3.5 pt-2.5 text-center text-[12.5px] text-muted">
        {STOCK_MOVEMENT.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
