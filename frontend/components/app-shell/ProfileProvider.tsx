"use client";

import { createContext, useContext, type ReactNode } from "react";
import { fetchProfile, type Profile } from "@/lib/data/users";
import { useAsync } from "@/lib/useAsync";

type ProfileContext = { profile?: Profile; reload: () => void };

const Ctx = createContext<ProfileContext>({ reload: () => {} });

/** Loads the signed-in user's profile once for the whole app shell. */
export default function ProfileProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { data, reload } = useAsync(() => fetchProfile(userId), [userId]);
  return <Ctx.Provider value={{ profile: data, reload }}>{children}</Ctx.Provider>;
}

export function useProfile() {
  return useContext(Ctx);
}
