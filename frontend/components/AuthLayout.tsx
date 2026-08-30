import type { ReactNode } from "react";
import Icon from "./Icon";

type AuthLayoutProps = {
 
  icon: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
 
  success?: boolean;

  compact?: boolean;

  footer?: ReactNode;

  decorated?: boolean;
};


export default function AuthLayout({
  icon,
  title,
  subtitle,
  children,
  success = false,
  compact = false,
  footer,
  decorated = false,
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-6 py-16">
      {decorated && (
        <>
    
          <div className="pointer-events-none absolute -top-40 -right-30 h-[560px] w-[620px] rounded-full bg-[#9FB6D4] opacity-55 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-55 -left-40 h-[560px] w-[620px] rounded-full bg-[#A9CBB4] opacity-45 blur-[130px]" />
        </>
      )}

      <div className="relative flex w-full max-w-[392px] flex-col items-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_10px_24px_rgba(11,76,140,.28)] ${
            success ? "bg-success" : "bg-brand"
          }`}
        >
          <Icon name={icon} size={30} className="text-white" />
        </div>

       
        <h1
          className={`mt-[22px] mb-1.5 text-center tracking-[-.02em] text-ink ${
            compact ? "text-xl" : "text-2xl"
          }`}
        >
          {title}
        </h1>
        <p className="mb-[30px] text-center text-sm text-muted">{subtitle}</p>

        <div className="flex w-full flex-col gap-5 rounded-2xl border border-border-soft bg-white px-6 pt-[26px] pb-7 shadow-[0_12px_32px_rgba(16,35,64,.06)]">
          {children}
        </div>

        {footer}
      </div>
    </div>
  );
}
