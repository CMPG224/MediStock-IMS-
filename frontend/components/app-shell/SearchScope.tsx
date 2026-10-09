"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchQuery } from "@/lib/useSearchQuery";

/** Remounts the page when the search term changes so paging and filters start fresh. */
function Keyed({ children }: { children: ReactNode }) {
  const q = useSearchQuery();
  return <div key={q} className="flex flex-1 flex-col">{children}</div>;
}

export default function SearchScope({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Keyed>{children}</Keyed>
    </Suspense>
  );
}
