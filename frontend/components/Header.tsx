import Icon from "../Icon";
import AlertsPanel from "./AlertsPanel";
import UserMenu from "./UserMenu";

type HeaderProps = {
  /** What this page's search box searches, e.g. "medicines, batches, suppliers". */
  searchPlaceholder: string;
};

// No "use client" — the interactive pieces (the alerts and user-menu
// dropdowns) are their own components and carry that requirement
// themselves. Matches the original prototype: a centred, fully-rounded
// search pill rather than a left-aligned rectangular field.
export default function Header({ searchPlaceholder }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center gap-5 border-b border-border-soft bg-white px-7 py-3">
      <div className="flex flex-1 justify-center">
        <div className="flex h-10 w-full max-w-[520px] items-center gap-2.5 rounded-[22px] border border-[#E1E7F0] bg-[#FBFCFE] px-4">
          <Icon name="search" size={19} className="text-[#5B6472]" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            aria-label="Search"
            className="w-full border-none bg-transparent text-[13.5px] text-ink placeholder:text-[#5B6472] focus:outline-none"
          />
        </div>
      </div>

      <AlertsPanel />
      <UserMenu />
    </header>
  );
}
