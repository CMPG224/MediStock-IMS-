import type { PostgrestError } from "@supabase/supabase-js";

export const PAGE_SIZE = 10;

/** Row range for a 1-based page, for `.range(from, to)`. */
export function pageRange(page: number): [number, number] {
  const from = (page - 1) * PAGE_SIZE;
  return [from, from + PAGE_SIZE - 1];
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** Unwraps a Supabase response, throwing a readable error. */
export function must<T>({ data, error }: { data: T | null; error: PostgrestError | null }): T {
  if (error) throw new Error(friendly(error));
  return data as T;
}

/** For updates: RLS filters rows out silently, so zero rows means "not allowed". */
export function mustAffect<T>(res: { data: T[] | null; error: PostgrestError | null }): T[] {
  const rows = must(res);
  if (!rows.length) throw new Error("You don't have permission to do that.");
  return rows;
}

function friendly(e: PostgrestError): string {
  if (e.code === "42501") return "You don't have permission to do that.";
  if (e.code === "23505") return "A record with those details already exists.";
  if (e.code === "23514") return "Some values aren't allowed. Check the form and try again.";
  return e.message;
}

/** Strips characters that would break a PostgREST `or=(...)` filter. */
export function searchTerm(q: string): string {
  return q.trim().replace(/[,()*%\\]/g, " ").trim();
}
