"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
  children: ReactNode;
  // ButtonHTMLAttributes gives us every real <button> prop (onClick, type,
  // disabled, aria-label, ...) for free, correctly typed. The Omit removes
  // "children" so our own definition above wins.
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;
// One class string per look. Keeping these as plain constants (rather than
// building the string by hand inside the component) is what makes each
// variant easy to scan and easy to hand off to a designer for review.
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
// Marked "use client" because this component takes an onClick handler as a
// prop. A Server Component is not allowed to hand a function to the browser
// — functions can't be serialized across the server/client boundary — so any
// component whose whole job is "run code when clicked" has to live on the
// client. Since Button is a generic building block that always accepts
// onClick, it's marked here once rather than leaving it to whoever imports
// it to get right.
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