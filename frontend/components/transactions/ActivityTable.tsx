import Icon from "@/components/Icon";
import Pagination from "@/components/ui/Pagination";
import { CARD, TD, TH } from "@/components/ui/buttons";
import type { Transaction } from "@/lib/data/transactions";
import { TYPE_LABEL, TYPE_PILL, formatQty, shortDay } from "./utils";

export default function ActivityTable({
  rows,
  loaded,
  summary,
  page,
  pages,
  onPageChange,
  onDownload,
}: {
  rows: Transaction[];
  loaded: boolean;
  summary: string;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  onDownload: () => void;
}) {
  return (
    <section className={`${CARD} overflow-hidden`} aria-labelledby="recent-activity">
      <div className="flex items-center justify-between border-b border-border-soft px-6 py-5">
        <h2 id="recent-activity" className="text-[18px] font-bold text-ink">Recent Activity</h2>
        <button type="button" onClick={onDownload} className="flex items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline">
          Download CSV <Icon name="download" size={15} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="bg-[#F3F6FB]">
            <tr>
              <th scope="col" className={TH}>Transaction ID</th>
              <th scope="col" className={TH}>Date</th>
              <th scope="col" className={TH}>Item</th>
              <th scope="col" className={TH}>Type</th>
              <th scope="col" className={`${TH} text-right`}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {loaded && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-[14px] text-muted">No transactions match this filter.</td>
              </tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-border-soft text-[14px] last:border-b-0">
                <td className={`${TD} whitespace-nowrap font-mono text-[13.5px] text-body`}>{t.reference}</td>
                <td className={`${TD} whitespace-nowrap text-body`}>{shortDay(t.day)}, {t.time}</td>
                <td className={`${TD} font-medium text-ink`}>
                  {t.item}
                  {t.status !== "COMPLETED" && (
                    <span className="ml-2 text-[11.5px] font-semibold uppercase text-muted">{t.status.toLowerCase()}</span>
                  )}
                </td>
                <td className={TD}>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${TYPE_PILL[t.type]}`}>
                    {TYPE_LABEL[t.type]}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap text-right font-bold ${t.quantity < 0 ? "text-danger" : "text-success"}`}>
                  {formatQty(t.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination summary={summary} page={page} pages={pages} onPageChange={onPageChange} />
    </section>
  );
}
