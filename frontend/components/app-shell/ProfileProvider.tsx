"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { applyAppearance, fetchSettings } from "@/lib/data/settings";
import { fetchProfile, type Profile } from "@/lib/data/users";
import { useAsync } from "@/lib/useAsync";

type ProfileContext = { profile?: Profile; reload: () => void };

const Ctx = createContext<ProfileContext>({ reload: () => {} });

/** Loads the signed-in user's profile once for the whole app shell. */
export default function ProfileProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { data, reload } = useAsync(() => fetchProfile(userId), [userId]);
  const router = useRouter();
  const settings = useAsync(() => fetchSettings(userId), [userId]).data;
  const theme = settings?.theme;
  const accent = settings?.accent;
  useEffect(() => {
    if (!theme || !accent) return;
    applyAppearance({ theme, accent });
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance({ theme, accent });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, accent]);
  const deactivated = data?.isActive === false;
  useEffect(() => {
    if (!deactivated) return;
    void supabase.auth.signOut().then(() => router.replace("/login"));
  }, [deactivated, router]);
  if (deactivated) return null;
  return <Ctx.Provider value={{ profile: data, reload }}>{children}</Ctx.Provider>;
}

export function useProfile() {
  return useContext(Ctx);
}
