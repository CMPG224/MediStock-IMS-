import Link from "next/link";

export type LegalSection = { heading: string; body: React.ReactNode };

export default function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
        <p className="mt-6 leading-relaxed text-slate-600">{intro}</p>

        {sections.map((s, i) => (
          <section key={s.heading} className="mt-8">
            <h2 className="text-lg font-bold text-slate-900">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-2 space-y-3 leading-relaxed text-slate-600">{s.body}</div>
          </section>
        ))}

        <nav aria-label="Legal pages" className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-6 text-sm">
          <Link href="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>
          <Link href="/legal/privacy" className="text-slate-500 hover:underline">Privacy Policy</Link>
          <Link href="/legal/terms" className="text-slate-500 hover:underline">Terms of Service</Link>
          <Link href="/legal/support" className="text-slate-500 hover:underline">Technical Support</Link>
        </nav>
      </article>
    </main>
  );
}

export function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-6">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
