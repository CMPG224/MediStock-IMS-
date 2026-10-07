"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/app-shell/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function AppLayout({ children }: { children: ReactNode }) {
  // Guards every page in the (app) group; render nothing until checked.
  const { loading } = useRequireAuth();
  if (loading) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
