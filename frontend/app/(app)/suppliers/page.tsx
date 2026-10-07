import Header from "@/components/app-shell/Header";
import SuppliersView from "@/components/suppliers/SuppliersView";
import AppFooter from "@/components/ui/AppFooter";

// Server component: the interactive directory + modal live in SuppliersView.
export default function SuppliersPage() {
  return (
    <>
      <Header searchPlaceholder="Search suppliers, medicines, or orders..." />
      <div className="flex flex-1 flex-col gap-[22px] p-7">
        <SuppliersView />
      </div>
      <AppFooter />
    </>
  );
}
