"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { CARD } from "@/components/ui/buttons";
import { askAssistant, type ChatMessage } from "@/lib/ai/client";
import { errorMessage } from "@/lib/useAsync";
import Markdown from "./Markdown";

const SUGGESTIONS = [
  "Which medicines are low on stock?",
  "What expires in the next 30 days?",
  "Which purchase orders are still open?",
  "Which supplier has the worst fulfilment rate?",
];

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const reply = await askAssistant(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${CARD} flex min-h-[460px] flex-1 flex-col`} aria-label="Assistant chat">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-6" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-body">Ask about your stock, expiries, orders or suppliers. Answers use your live inventory data.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-white px-4 py-2 text-[13px] text-body hover:bg-page"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
              m.role === "user" ? "max-w-[85%] self-end whitespace-pre-wrap bg-brand text-white" : "max-w-full self-start bg-brand-tint text-ink"
            }`}
          >
            {m.role === "user" ? m.content : <Markdown>{m.content}</Markdown>}
          </div>
        ))}
        {busy && <div className="self-start text-[13px] text-muted">Thinking…</div>}
        {error && <p role="alert" className="text-[13px] font-medium text-danger">{error}</p>}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-3 border-t border-border-soft p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your inventory…"
          aria-label="Message"
          maxLength={2000}
          className="h-11 flex-1 rounded-full border border-border bg-white px-5 text-[14px] text-ink focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
        >
          <Icon name="send" size={19} />
        </button>
      </form>
    </section>
  );
}
