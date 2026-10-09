"use client";

import { useSearchParams } from "next/navigation";

/** The header search term, kept in the URL as `?q=` so it survives reloads and back/forward. */
export function useSearchQuery(): string {
  return useSearchParams().get("q")?.trim() ?? "";
}
