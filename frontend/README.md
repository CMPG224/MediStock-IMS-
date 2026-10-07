# MediStock IMS — Frontend

Auth pages (Part 1) plus the dashboard (Part 2, in progress). Matches the
exact Next.js / React / Tailwind versions already scaffolded in the team
repo's `frontend/` folder.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign in with any email/password on the login
screen (there's no real backend wired up yet) and you'll land on
`/dashboard`.

## What's on the dashboard

This dashboard matches the layout and copy of the original HTML prototype's
dashboard screen, with its visual details (icon style, a couple of card
colours, one button label) corrected against the actual Figma design
system the team uses:

- The sidebar is the original's flat nine-item list (Dashboard, Medicine,
  Suppliers, Transactions, Orders, Reports, Users, Logs, Settings) with
  pill-shaped nav buttons, not the grouped four-section version from an
  earlier pass. Only Dashboard has a page so far — the rest are marked
  "Soon" rather than linking anywhere.
- Six KPI cards across the top (Total Medicines, Total Suppliers, Low
  Stock, Expiring Soon, Expired, Total Value), matching the original's
  exact numbers and icons. Only Low Stock gets a tinted (red) card
  background — Total Value is a neutral white card with a green icon
  badge, matching the real design system rather than the earlier
  green-tinted-card guess.
- An Inventory Trend chart with a 1W / 1M / 1Y pill toggle, and a Stock
  Movement bar chart next to it — both plain SVG/CSS, no charting library.
- Recent Transactions (uppercase status pills: COMPLETED / PENDING /
  REJECTED) and Urgent Alerts (colour-coded, left-bordered cards, "MARK FOR
  REVIEW" action) below.
- The header's notification bell and user-menu dropdowns match the
  original's exact panel layout, including "Mark all as read" and the
  account menu with Sign Out split off in red. The user-menu avatar is the
  real photo from the design system rather than a placeholder icon.

Icons are [Lucide](https://lucide.dev) React components (`lucide-react`),
matching the design system's outlined icon style, rather than Google's
Material Symbols font used in the earlier pass — see `components/Icon.tsx`
for the name-to-icon mapping. Every call site still just passes a `name`
prop, so nothing else needed to change.

The typeface is still Inter — the same font the design always used — but
it's now self-hosted via `@fontsource/inter` (the actual font files ship
inside the npm package) instead of `next/font/google` fetching it from
Google Fonts at build time. That fetch can fail in a network-restricted
environment, silently falling back to a serif system font; self-hosting
removes that dependency entirely.

New pieces, in `components/app-shell/` and `components/charts/`:
`Sidebar`, `Header`, `AlertsPanel`, `UserMenu`, `StatusPill`, `KpiCard`,
`UrgentAlerts`, `LineChart`, `StockMovementChart`. Mock data lives in
`lib/mock-data.ts` and matches the original prototype's numbers exactly —
nothing here is connected to Supabase yet (see
`SUPABASE-BACKEND-README.md` at the project root).

## Note

`node_modules` and `.next` are not included — `npm install` and `npm run dev`
regenerate them. Neither is ever committed to git.
