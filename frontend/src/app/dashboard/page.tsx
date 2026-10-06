import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Dashboard</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Welcome to Medistock IMS</h1>
        <p className="mt-3 text-slate-600">
          Your inventory workspace is ready. This is the first Next.js dashboard route for the app.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
