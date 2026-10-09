"use client";

import type { ReactNode } from "react";
import ProfileProvider from "@/components/app-shell/ProfileProvider";
import SearchScope from "@/components/app-shell/SearchScope";
import Sidebar from "@/components/app-shell/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function AppLayout({ children }: { children: ReactNode }) {
  // Guards every page in the (app) group; render nothing until checked.
  const { user, loading } = useRequireAuth();
  if (loading || !user) return null;

  return (
    <ProfileProvider userId={user.id}>
      <div className="flex h-screen overflow-hidden bg-page">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-y-auto">
          <SearchScope>{children}</SearchScope>
        </main>
      </div>
    </ProfileProvider>
  );
}
