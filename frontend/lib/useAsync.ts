"use client";

import { useCallback, useEffect, useState } from "react";

type Result<T> = { key: string; data?: T; error?: string };

/**
 * Runs `fn` whenever `deps` change and tracks its result. The previous data
 * stays visible while a new request is in flight, so filters and paging
 * don't flash an empty table.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([...deps, version]);
  const [result, setResult] = useState<Result<T> | null>(null);
  const [data, setData] = useState<T>();

  useEffect(() => {
    let active = true;
    fn().then(
      (value) => {
        if (!active) return;
        setData(value);
        setResult({ key, data: value });
      },
      (e: unknown) => active && setResult({ key, error: errorMessage(e) }),
    );
    return () => {
      active = false;
    };
    // `key` already encodes every dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data,
    error: result?.key === key ? result.error : undefined,
    loading: result?.key !== key,
    reload,
  };
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong. Try again.";
}
