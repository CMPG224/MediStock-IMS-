import type { ReactNode } from "react";

export const INPUT_BASE =
  "h-[42px] w-full rounded-lg border bg-white px-3.5 text-[14px] text-ink placeholder:text-[#98A2B3] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30";
export const inputBorder = (invalid: boolean) =>
  invalid ? "border-danger bg-danger-bg/60" : "border-border";

/** Label row (with REQUIRED / INVALID tag), the control, and the error text. */
export default function FormField({
  id,
  label,
  required,
  error,
  tag,
  children,
  className = "",
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  tag?: "REQUIRED" | "INVALID";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-label">
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              {" "}*
            </span>
          )}
        </label>
        {error && tag && (
          <span className="rounded bg-danger-bg px-2 py-0.5 text-[10px] font-bold tracking-[.05em] text-danger">{tag}</span>
        )}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
