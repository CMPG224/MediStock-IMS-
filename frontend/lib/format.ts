const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "R12,450.00" */
export function formatRand(n: number): string {
  return `R${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "R142.5K", "R1.2M" */
export function formatRandCompact(n: number): string {
  if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R${(n / 1_000).toFixed(1)}K`;
  return `R${n.toFixed(0)}`;
}

/** Local calendar day of a timestamp, "2026-10-24". */
export function isoDay(ts: string | Date): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local "HH:mm" of a timestamp. */
export function clock(ts: string | Date): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local "2026-09-30 14:22:07". */
export function fullTimestamp(ts: string): string {
  const d = new Date(ts);
  return `${isoDay(d)} ${clock(d)}:${pad(d.getSeconds())}`;
}

/** "2026-08-15" -> "Aug 15, 2026"; null -> "—". */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${MONTHS[Number(m) - 1]} ${d}, ${y}`;
}

/** "2026-10-24" -> "Oct 24" */
export function shortDay(day: string): string {
  const [, m, d] = day.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "2026-05-01" -> "MAY" */
export function monthLabel(day: string): string {
  return MONTHS[Number(day.slice(5, 7)) - 1].toUpperCase();
}

/** "2 mins ago", "3 hours ago", "Yesterday", or a short date. */
export function relativeTime(ts: string | null): string {
  if (!ts) return "Never";
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (hours < 48) return "Yesterday";
  return formatDate(isoDay(ts));
}

/** First letter of a name, ignoring a title like "Dr." */
export function initial(name: string): string {
  return (name.replace(/^(Dr\.|Nurse|Mr\.|Ms\.|Mrs\.)\s+/i, "").charAt(0) || "?").toUpperCase();
}

/** "Dr. TR Mokwena" -> "TR" */
export function initials(name: string): string {
  const words = name.replace(/^(Dr\.|Nurse|Mr\.|Ms\.|Mrs\.)\s+/i, "").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
