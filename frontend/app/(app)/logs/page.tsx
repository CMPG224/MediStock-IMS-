import Header from "@/components/app-shell/Header";
import LogsView from "@/components/logs/LogsView";
import AppFooter from "@/components/ui/AppFooter";

export default function LogsPage() {
  return (
    <>
      <Header searchPlaceholder="Search activity logs..." />
      <LogsView />
      <AppFooter />
    </>
  );
}
