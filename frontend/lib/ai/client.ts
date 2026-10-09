import { supabase } from "@/lib/supabase";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ExtractedInvoice = {
  supplier: string;
  reference: string;
  items: { name: string; quantity: number; unitCost: number }[];
};

async function callAi(body: unknown): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify(body),
  });
  const out = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!res.ok || !out.reply) throw new Error(out.error ?? "The assistant is unavailable. Try again.");
  return out.reply;
}

export const askAssistant = (messages: ChatMessage[]) => callAi({ mode: "chat", messages });

export const summariseReport = (text: string) => callAi({ mode: "summary", text });

/** The model is asked for JSON; anything malformed is rejected rather than trusted. */
export async function extractInvoice(text: string): Promise<ExtractedInvoice> {
  const raw = await callAi({ mode: "invoice", text });
  let parsed: Partial<ExtractedInvoice>;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
  } catch {
    throw new Error("Could not read that document. Try a clearer PDF.");
  }
  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .map((i) => ({ name: String(i?.name ?? "").trim(), quantity: Math.round(Number(i?.quantity) || 0), unitCost: Number(i?.unitCost) || 0 }))
    .filter((i) => i.name && i.quantity > 0);
  if (!items.length) throw new Error("No line items were found in that document.");
  return { supplier: String(parsed.supplier ?? ""), reference: String(parsed.reference ?? ""), items };
}
