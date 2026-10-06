/** The copyright + legal-links strip at the bottom of every app page. */
export default function AppFooter() {
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border-soft px-7 py-5 text-[12.5px] text-muted">
      <span>© 2026 MediStock IMS v2.4.1</span>
      <nav aria-label="Footer" className="flex gap-6 font-medium">
        <a href="#" className="hover:text-brand">Support Center</a>
        <a href="#" className="hover:text-brand">Privacy Policy</a>
        <a href="#" className="hover:text-brand">Terms of Service</a>
      </nav>
    </footer>
  );
}
