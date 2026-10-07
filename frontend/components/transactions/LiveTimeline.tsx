import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/Icon";
import { CARD } from "@/components/ui/buttons";
import { initial } from "@/lib/format";
import type { Transaction } from "@/lib/data/transactions";
import { DEFAULT_TITLE, TYPE_DOT, timelineWhen } from "./utils";

export default function LiveTimeline({ txs }: { txs: Transaction[] }) {
  const newestDay = txs[0]?.day ?? "";

  return (
    <section className={`${CARD} overflow-hidden`} aria-labelledby="live-timeline">
      <div className="flex items-center justify-between border-b border-border-soft px-6 py-5">
        <h2 id="live-timeline" className="text-[18px] font-bold text-ink">Live Timeline</h2>
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-success">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" /> Live
        </span>
      </div>
      <ol className="relative m-6 flex flex-col gap-6 border-l-2 border-border-soft pl-6">
        {txs.length === 0 && <li className="text-[13px] text-muted">No stock movements yet.</li>}
        {txs.map((t) => (
          <li key={t.id} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[33px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${TYPE_DOT[t.type]}`}
            />
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[14.5px] font-bold text-ink">{DEFAULT_TITLE[t.type]}</h3>
              <span className="shrink-0 font-mono text-[11.5px] text-muted">{timelineWhen(t, newestDay)}</span>
            </div>
            <div className="mt-2 rounded-[10px] bg-[#F1F5FB] p-3.5">
              <p className="text-[13px] leading-[1.5] text-body">{t.description}</p>
              <div className="mt-3 flex items-center gap-2">
                {t.actorIsSystem ? (
                  <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                    <Icon name="bot" size={13} />
                  </span>
                ) : (
                  <Avatar letter={initial(t.actor)} size={24} />
                )}
                <span className="text-[12.5px] font-semibold text-ink">{t.actor}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
