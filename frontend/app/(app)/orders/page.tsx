import Header from "@/components/app-shell/Header";
import AppFooter from "@/components/ui/AppFooter";
import OrdersView from "@/components/orders/OrdersView";

export const metadata = { title: "Purchase Orders | MediStock IMS" };

export default function OrdersPage() {
  return (
    <>
      <Header searchPlaceholder="Search orders, suppliers or ID..." />
      <div className="flex flex-1 flex-col gap-[22px] p-7">
        <OrdersView />
      </div>
      <AppFooter />
    </>
  );
}
