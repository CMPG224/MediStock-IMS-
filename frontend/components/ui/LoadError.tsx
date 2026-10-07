import Icon from "../Icon";

/** Inline error banner with a retry button for failed data loads. */
export default function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-[#F7C6C1] bg-[#FDEDEB] px-5 py-3.5 text-danger">
      <span className="flex items-center gap-2.5 text-[13.5px] font-semibold">
        <Icon name="error" size={18} />
        {message}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-[13px] font-bold underline-offset-2 hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}
