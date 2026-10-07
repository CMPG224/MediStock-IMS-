import Header from "@/components/app-shell/Header";
import SettingsView from "@/components/settings/SettingsView";
import AppFooter from "@/components/ui/AppFooter";
import PageHeader from "@/components/ui/PageHeader";

export default function SettingsPage() {
  return (
    <>
      <Header searchPlaceholder="Search suppliers, medicines, or orders..." />
      <div className="flex flex-1 flex-col gap-[22px] p-7">
        <PageHeader title="Settings" description="Manage your account, notifications, and system preferences." />
        <SettingsView />
      </div>
      <AppFooter />
    </>
  );
}
