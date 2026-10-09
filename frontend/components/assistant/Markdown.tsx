"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

// Model output is untrusted: react-markdown renders no raw HTML, and links open
// safely in a new tab. Tables get the same styling as the app's own tables.
const COMPONENTS: Components = {
  table: (p) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border-soft bg-white">
      <table className="w-full border-collapse text-left text-[13px]" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-[#F3F6FB]" {...p} />,
  th: (p) => <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[.05em] text-muted" {...p} />,
  td: (p) => <td className="border-t border-border-soft px-3 py-2 align-top text-ink" {...p} />,
  a: (p) => <a target="_blank" rel="noreferrer noopener" className="text-brand underline" {...p} />,
  p: (p) => <p className="my-1.5 first:mt-0 last:mb-0" {...p} />,
  ul: (p) => <ul className="my-1.5 list-disc pl-5" {...p} />,
  ol: (p) => <ol className="my-1.5 list-decimal pl-5" {...p} />,
  code: (p) => <code className="rounded bg-white/70 px-1 font-mono text-[12.5px]" {...p} />,
};

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={COMPONENTS}>
      {children}
    </ReactMarkdown>
  );
}
