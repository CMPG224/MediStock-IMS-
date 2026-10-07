import Icon from "@/components/Icon";

/** The dashed "add new ..." tile at the end of the featured row. */
export default function AddCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed border-border bg-white/60 p-5 hover:border-brand hover:bg-brand-tint/50"
    >
      <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DDE7F7] text-brand">
        <Icon name="add" size={20} />
      </span>
      <span className="text-[13.5px] font-bold text-brand">{label}</span>
    </button>
  );
}
