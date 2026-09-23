"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
  children: ReactNode;

} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const base =
  "flex items-center justify-center gap-2 rounded-[9px] font-bold cursor-pointer " +
  "transition-colors disabled:opacity-55 disabled:cursor-not-allowed";
const variants = {
  primary:
    "h-[50px] border-none bg-brand text-white text-lg shadow-[0_6px_16px_rgba(11,76,140,.24)] " +
    "hover:bg-brand-dark",
  secondary:
    "h-[46px] border border-border bg-white text-[#182B40] text-[13.5px] font-semibold " +
    "hover:border-brand hover:bg-[#F7FAFE]",
  ghost:
    "h-[44px] border-none bg-transparent text-brand text-[13.5px] hover:underline",
};

export default function Button({
  variant = "primary",
  fullWidth = false,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const classes = [base, variants[variant], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
  // type="button" by default. Without it a button inside a <form> defaults to
  // type="submit" and reloads the page — a classic beginner bug.
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
