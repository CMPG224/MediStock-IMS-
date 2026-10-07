import Header from "@/components/app-shell/Header";
import AppFooter from "@/components/ui/AppFooter";
import TransactionsView from "@/components/transactions/TransactionsView";

export const metadata = { title: "Transactions | MediStock IMS" };

export default function TransactionsPage() {
  return (
    <>
      <Header searchPlaceholder="Search transactions..." />
      <div className="flex flex-1 flex-col gap-[22px] p-7">
        <TransactionsView />
      </div>
      <AppFooter />
    </>
  );
}
