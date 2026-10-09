"use client";

import { useState } from "react";
import ChatPanel from "./ChatPanel";
import InvoicePanel from "./InvoicePanel";

const TABS = [
  { key: "chat", label: "Ask the assistant" },
  { key: "invoice", label: "Import invoice" },
] as const;

export default function AssistantView() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("chat");
  return (
    <>
      <div role="tablist" aria-label="Assistant tools" className="flex gap-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`h-[42px] rounded-full border px-5 text-[14px] font-medium ${
              tab === t.key ? "border-brand bg-brand text-white" : "border-border bg-white text-body hover:bg-page"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "chat" ? <ChatPanel /> : <InvoicePanel />}
    </>
  );
}
