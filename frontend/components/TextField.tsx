"use client";

import { useId, type ReactNode } from "react";
import Icon from "./Icon";

type TextFieldProps = {
  label: string;
  /** Icon name (see Icon.tsx) shown inside the box, e.g. "mail". */
  icon: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
  /** Marks the field required, both visually and for screen readers. */
  required?: boolean;
  /** Error text. When present it is announced and the field is flagged. */
  error?: string;
  /** Extra content on the right of the label row, e.g. a "Forgot?" link. */
  labelAction?: ReactNode;
  /** Extra control inside the box on the right, e.g. a show/hide button. */
  trailing?: ReactNode;
  autoComplete?: string;
};

export default function TextField({
  label,
  icon,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  error,
  labelAction,
  trailing,
  autoComplete,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-2xs font-bold tracking-[.09em] text-label">
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
        {labelAction}
      </div>

      {/* Borderless input inside a styled box; focus-within highlights the box. */}
      <div className="flex h-[46px] items-center gap-3 rounded-[9px] border border-border bg-white px-3 focus-within:outline-2 focus-within:outline-brand focus-within:outline-offset-1">
        <Icon name={icon} className="text-muted" />
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 border-none bg-transparent text-base text-ink outline-none placeholder:text-slate-400"
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {trailing}
      </div>

      {error && (
        <span id={errorId} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
