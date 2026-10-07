import Header from "@/components/app-shell/Header";
import MedicineView from "@/components/medicine/MedicineView";
import AppFooter from "@/components/ui/AppFooter";

// Server component: the interactive list + modal live in MedicineView.
export default function MedicinePage() {
  return (
    <>
      <Header searchPlaceholder="Search suppliers, medicines, or orders..." />
      <div className="flex flex-1 flex-col gap-[22px] p-7">
        <MedicineView />
      </div>
      <AppFooter />
    </>
  );
}
