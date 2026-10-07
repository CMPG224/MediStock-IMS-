import type { ReactNode } from "react";
import Sidebar from "@/components/app-shell/Sidebar";

// This layout wraps every page inside the (app) group with the sidebar.
// The parentheses in the folder name "(app)" tell Next.js "group these
// routes, but don't add /app/ to their URL" — that's why /dashboard still
// works even though the file lives at app/(app)/dashboard/page.tsx. The
// four auth pages sit outside this group, at the top level of app/, so
// they never get a sidebar.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
