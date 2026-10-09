import Header from "@/components/app-shell/Header";
import AssistantView from "@/components/assistant/AssistantView";
import AppFooter from "@/components/ui/AppFooter";
import PageHeader from "@/components/ui/PageHeader";

export default function AssistantPage() {
  return (
    <>
      <Header searchPlaceholder="Search suppliers, medicines, or orders..." />
      <div className="flex flex-1 flex-col gap-[22px] p-7">
        <PageHeader title="AI Assistant" description="Ask questions about your inventory and import supplier invoices from PDF." />
        <AssistantView />
      </div>
      <AppFooter />
    </>
  );
}
