import Link from "next/link";
import Header from "@/components/app-shell/Header";
import KpiCard from "@/components/app-shell/KpiCard";
import StatusPill from "@/components/app-shell/StatusPill";
import UrgentAlerts from "@/components/app-shell/UrgentAlerts";
import Icon from "@/components/Icon";
import LineChart from "@/components/charts/LineChart";
import StockMovementChart from "@/components/charts/StockMovementChart";
import { KPIS, TRANSACTIONS } from "@/lib/mock-data";

const PANEL = "rounded-[14px] border border-border-soft bg-white shadow-[0_2px_10px_rgba(16,35,64,.04)]";

const QTY_COLOR = { success: "text-success", danger: "text-danger", neutral: "text-ink" } as const;

export default function DashboardPage() {
  return (
    <>
      <Header searchPlaceholder="Search medicines, suppliers, or transactions..." />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 p-4 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-bold tracking-[-.02em] text-ink">Good morning, Dr. Mokwena.</h1>
            <p className="text-[14.5px] text-muted">Here&rsquo;s your inventory overview for today.</p>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-[14px] font-semibold text-ink transition hover:border-brand hover:text-brand active:scale-[0.98]"
            >
              <Icon name="upload" size={17} />
              Export Report
            </button>
            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-[10px] bg-brand px-4.5 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(11,76,140,.2)] transition hover:bg-brand-dark active:scale-[0.98]"
            >
              <Icon name="add" size={18} />
              Add Medicine
            </button>
          </div>
        </div>

        {/* gap-px over a border-coloured background draws the dividers. */}
        <dl
          className={`${PANEL} grid grid-cols-2 gap-px overflow-hidden bg-border-soft sm:grid-cols-3 xl:grid-cols-6`}
        >
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.65fr_1fr]">
          <section className={`${PANEL} px-6 pb-4 pt-5.5`}>
            <LineChart />
          </section>
          <section className={`${PANEL} flex flex-col px-6 pb-4 pt-5.5`}>
            <StockMovementChart />
          </section>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.65fr_1fr]">
          <section className={`${PANEL} overflow-hidden`}>
            <div className="flex items-center justify-between px-6 pb-3 pt-5.5">
              <h2 className="text-[18px] font-bold text-ink">Recent Transactions</h2>
              <Link
                href="/transactions"
                className="flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
              >
                View all
                <Icon name="chevron_right" size={15} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-border-soft bg-page text-[11px] font-semibold uppercase tracking-[.05em] text-muted">
                    <th className="px-6 py-2.5 font-semibold">Item</th>
                    <th className="px-6 py-2.5 font-semibold">Type</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Quantity</th>
                    <th className="px-6 py-2.5 font-semibold">Status</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {TRANSACTIONS.map((tx) => (
                    <tr key={tx.item + tx.time} className="text-[14px] transition-colors hover:bg-page">
                      <td className="px-6 py-3.5 font-semibold text-ink">{tx.item}</td>
                      <td className="px-6 py-3.5 text-body">{tx.type}</td>
                      <td className={`px-6 py-3.5 text-right font-semibold tabular-nums ${QTY_COLOR[tx.qtyTone]}`}>
                        {tx.qty}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusPill status={tx.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right text-[13px] text-muted">{tx.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <UrgentAlerts />
        </div>
      </div>
    </>
  );
}
