import Header from "@/components/app-shell/Header";
import Icon from "@/components/Icon";
import ExportPdfButton from "@/components/reports/ExportPdfButton";
import ReportGenerator from "@/components/reports/ReportGenerator";
import AvailableReports from "@/components/reports/AvailableReports";
import InventoryValue from "@/components/reports/InventoryValue";
import MonthlyExpenditure from "@/components/reports/MonthlyExpenditure";
import StockTurnover from "@/components/reports/StockTurnover";
import SupplierPerformance from "@/components/reports/SupplierPerformance";
import AppFooter from "@/components/ui/AppFooter";
import PageHeader from "@/components/ui/PageHeader";

export default function ReportsPage() {
  return (
    <>
      <Header searchPlaceholder="Search analytics..." />
      <div className="flex flex-1 flex-col gap-[22px] p-7">
        <PageHeader
          title="Reports & Analytics"
          description="Real-time inventory valuation and operational performance insights."
          actions={
            <>
              <button
                type="button"
                className="flex h-[46px] items-center gap-2 rounded-full bg-brand-tint px-4 text-[14px] font-semibold text-brand hover:bg-[#DDE7F7]"
              >
                <Icon name="calendar_month" size={17} />
                Jun 1 - Jun 31, 2026
                <Icon name="expand_more" size={16} />
              </button>
              <ExportPdfButton />
            </>
          }
        />
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[2fr_1fr]">
          <MonthlyExpenditure />
          <InventoryValue />
        </div>
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[3fr_2fr]">
          <SupplierPerformance />
          <StockTurnover />
        </div>
        <AvailableReports />
        <ReportGenerator />
      </div>
      <AppFooter />
    </>
  );
}
