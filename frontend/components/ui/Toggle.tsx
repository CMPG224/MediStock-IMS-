"use client";

import { useState } from "react";

/** An accessible on/off switch (role="switch"). Uncontrolled by default;
 * pass `checked` + `onChange` to control it. */
export default function Toggle({
  label,
  defaultChecked = false,
  checked,
  onChange,
}: {
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (next: boolean) => void;
}) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        const next = !on;
        setInner(next);
        onChange?.(next);
      }}
      className={`relative h-[24px] w-[44px] shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-[#D5DCE6]"}`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-[left] ${
          on ? "left-[23px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}
