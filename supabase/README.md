# MediStock IMS — Backend (Supabase)

This **replaces** the earlier Django + FastAPI backend scaffold. If that's
still sitting in the repo or on a branch, it can be deleted — nothing here
depends on it or builds on top of it.

> **⚠️ Caveat, updated.** The auth migration (`20260908120000_init_schema.sql`)
> is still untested against a real *Supabase* stack — no Docker/Supabase CLI in
> the sandbox that built it, and that hasn't changed. The **dashboard
> migration** (`20260922000000_dashboard_schema.sql`), the **app-pages
> migration** (`20260930000000_app_pages_schema.sql`) and `seed.sql` *have*
> been run for real: a plain local Postgres 16, with a small stub for the
> Supabase `auth.*` pieces the SQL references (`auth.users`, `auth.uid()`,
> `auth.role()`, plus the `anon`/`authenticated`/`service_role` roles for the
> third migration's grants) — not the full Supabase stack, but the whole chain
> (init → dashboard → app pages → seed) applied from an empty database with
> `ON_ERROR_STOP`, and the views, triggers and RLS policies were queried
> afterwards (see "App pages data" → "What was tested"). That's meaningfully
> more confidence than "syntax I'm confident in," but it's still not the real
> Supabase Auth/PostgREST request path — run `supabase db reset` against an
> actual project before trusting this fully.

---

## Why this is a smaller change than it sounds

Two of the four auth screens need **zero custom backend code** with
Supabase — `signInWithPassword` and `resetPasswordForEmail` are built into
the client library. Only the Hospital Portal screen (facility code + staff
ID, no password) needs something custom, because that login shape doesn't
exist as a built-in Supabase Auth method. That's the one Edge Function in
this repo.

| Screen | Before (Django) | Now (Supabase) |
| --- | --- | --- |
| Login | Custom `LoginView` + JWT issuing | `supabase.auth.signInWithPassword()` — no backend code |
| Forgot Password | Custom view, email sending unimplemented (needed a provider decision) | `supabase.auth.resetPasswordForEmail()` — no backend code, Supabase sends the email itself |
| Hospital Portal | Custom `HospitalLoginView` | One Edge Function (`hospital-login`) — still custom, but ~100 lines instead of a full Django view + serializer + URL wiring |
| SSO | Not built — flagged as needing its own design pass | Still not built. Supabase has built-in OAuth support (`signInWithOAuth`), which makes the *plumbing* easier once you get here — but choosing and configuring an actual identity provider is still a real decision, not something this migration resolves for you |

---

## What's here

```
supabase/
├── config.toml                              Supabase CLI project settings
├── migrations/
│   ├── 20260908120000_init_schema.sql       auth: profiles + Hospital Portal secret
│   ├── 20260922000000_dashboard_schema.sql  dashboard: medicines, suppliers, transactions,
│   │                                         purchase orders, notifications, KPI/chart views
│   └── 20260930000000_app_pages_schema.sql  the other seven pages: medicine/supplier/transaction/
│                                             order extensions, purchase_order_items, reports,
│                                             user_settings, activity_logs, role guard, views
├── seed.sql                                 local dev test accounts + sample data for all pages
└── functions/
    └── hospital-login/
        └── index.ts                         the one custom Edge Function
```

---

## Setting it up

Install the Supabase CLI if you don't have it —
[supabase.com/docs/guides/cli](https://supabase.com/docs/guides/local-development)
covers this per OS. You'll also need Docker running (the CLI runs a full
local Supabase stack — Postgres, Auth, Storage, the API gateway — in
containers).

```bash
cd supabase   # or wherever this folder lands in the repo
supabase init      # skip if config.toml already exists (it does — see above)
supabase start
```

`supabase start` prints out a block of local URLs and keys — the ones you
need for the frontend's `.env.local`:

```
API URL: http://localhost:54321
anon key: eyJ...
service_role key: eyJ...
```

Apply the migration and seed data:

```bash
supabase db reset
```

(`db reset` re-runs every migration from scratch AND `seed.sql` — that's
the normal way to pick up schema changes in local dev, not something
destructive to be nervous about before real data exists.)

### Test accounts

`seed.sql` only runs locally. On the hosted project, run
[`test-accounts.sql`](test-accounts.sql) once in Dashboard → SQL Editor (after
the migrations); it's safe to re-run.

| Login method | Credentials | Role |
| --- | --- | --- |
| Email/password | `admin@medistock.test` / `TestPass123!` | administrator |
| Email/password | `pharmacist@medistock.test` / `TestPass123!` | pharmacist |
| Email/password | `manager@medistock.test` / `TestPass123!` | manager |
| Email/password | `nurse@medistock.test` / `TestPass123!` | nurse |
| Email/password | `staff@medistock.test` / `TestPass123!` | staff |
| Email/password | `invited@medistock.test` / `TestPass123!` | pharmacist, inactive ("pending" on the Users page) |
| Hospital Portal | `facility_code=WC-GEN-014`, `staff_id=STF-0001` | staff |

`seed.sql` also now inserts a small set of dashboard rows — 2 suppliers, 4
medicines, a handful of stock transactions and purchase orders — echoing
several of the exact items in `frontend/lib/mock-data.ts` (Amoxicillin,
Ibuprofen, Global Pharma...), so `select * from public.dashboard_kpis;`
returns something real immediately after `supabase db reset` instead of
all zeros.

### Deploying the Edge Function

Locally, `supabase start` already serves it — no separate deploy step
needed for local dev. To push it to your actual hosted Supabase project:

```bash
supabase link --project-ref <your-project-ref>   # once, links this folder to the real project
supabase functions deploy hospital-login
```

The function needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` in its environment — Supabase sets the first two
automatically for every deployed function; the service role key needs
setting explicitly as a function secret:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Never put the service role key in the frontend, or in any `NEXT_PUBLIC_`
variable.** It bypasses every Row Level Security policy in the database.
It belongs in exactly one place: the Edge Function's own environment.

---

## The schema, briefly

**`profiles`** — one row per user, holding what Supabase's own `auth.users`
table doesn't: full name, role, and the facility_code/staff_id pair.
Created automatically (via a trigger) the instant someone signs up — you
never insert into this table by hand.

**Row Level Security (RLS)** is doing real access-control work here, not
just decoration:
- A user can read and update their own profile
- A trigger blocks a sneaky path where a normal update call could set
  `role = 'administrator'` on yourself
- Administrators can read every profile (needed for the eventual Users
  screen)

**`hospital_login_secrets`** — has RLS enabled with **zero policies**,
which in Postgres means nobody using the app's normal API keys can touch it
at all. Only the Edge Function, using the service-role key, can read it.
This is where the "real password nobody types" for each hospital account
lives.

If you're touching this schema later, copy this pattern: **enable RLS on
every table, and write down explicitly who can read/write what** — an
RLS-enabled table with no policies is completely locked down by default,
which is the safe failure mode; a table with RLS *disabled* is open to
everyone with an API key, which is very much not. (The dashboard migration
below follows the exact same pattern, on more tables.)

---

## Dashboard data

The dashboard screen at `/dashboard` is built and reviewable, but every
number on it currently comes from `frontend/lib/mock-data.ts`, not a
database — there wasn't one connected yet when that screen was built. The
`20260922000000_dashboard_schema.sql` migration adds the tables and views
that data should come from once someone wires the screen up for real. This
table is the map from one to the other:

| mock-data.ts export | Backed by | Notes |
| --- | --- | --- |
| `KPIS` (the six cards) | `select * from public.dashboard_kpis;` | One view, one row, six columns — `total_medicines`, `total_suppliers`, `low_stock`, `expiring_soon`, `expired`, `total_value`. Maps 1:1 to the six `KPIS` entries in the same order. |
| `TREND_RANGES` (Inventory Trend chart) | `public.inventory_snapshots` | See "Populating inventory_snapshots" below — nothing writes to this table yet. |
| `STOCK_MOVEMENT` (bar chart) | `select * from public.stock_movement_monthly;` | Returns one row per month with `stock_in`/`stock_out` sums. The mock data plots one bar per month, not two — decide in the frontend whether that's `stock_in`, `stock_out`, or `stock_in - stock_out` before wiring this up. |
| `TRANSACTIONS` (Recent Transactions table) | `select * from public.stock_transactions order by created_at desc limit 5;` | Join to `medicines` for the item name: `select t.*, m.name from public.stock_transactions t join public.medicines m on m.id = t.medicine_id order by t.created_at desc limit 5;` |
| `URGENT_ALERTS` (dashboard panel) | `select * from public.notifications where severity in ('danger','warning') and not resolved order by created_at desc;` | |
| `ALERTS` (header notification bell) | `select * from public.notifications order by created_at desc limit 10;` | Same table as Urgent Alerts, different filter — `unread` in the mock data becomes `not (auth.uid() = any(read_by))` once a real user is signed in. |

Everything above is a plain `select` — the frontend can call
`supabase.from("dashboard_kpis").select()` (views work the same as tables
through the client library) the same way the auth screens above call
`supabase.auth.*`.

### Where the numbers actually come from

Nothing in this migration invents data. Each piece traces back to a real
table:

- **`medicines`** — one row per catalogue item. `quantity_on_hand` is never
  updated directly; it's kept in sync by a trigger (`apply_stock_transaction`)
  that fires whenever a *completed* row is inserted into
  `stock_transactions`. A `pending` or `rejected` transaction (like the
  REJECTED return in the mock `TRANSACTIONS` data) records intent without
  moving stock — matching what those statuses mean in the mock data.
- **`suppliers`** and **`purchase_orders`** — back the Total Suppliers KPI
  and the Supplier Delay / Purchase Order Delivered alerts respectively.
- **`notifications`** — rather than something in application code
  remembering to create an alert, two triggers watch real state and manage
  this table on their own: `medicines_notify_low_stock` fires when
  `quantity_on_hand` crosses `reorder_point` in either direction (creating
  the alert, and **resolving it again once restocked** — tested locally: a
  medicine seeded at 12/50 got a "Low Stock" notification on insert, and a
  follow-up +100 completed stock-in resolved it automatically), and
  `purchase_orders_notify_status` fires on a status change to `delayed` or
  `delivered`. Nothing needs to remember to call an "add notification"
  function from application code.

### Populating `inventory_snapshots`

Every other chart/table above reads live from `medicines` /
`stock_transactions` directly — but the Inventory Trend line chart needs
history (units on hand *as of each day*), and reconstructing that by
replaying every transaction back to day one gets slower the longer the app
has been running. `inventory_snapshots` holds one row per day instead, and
nothing writes to it yet. Two ways to do that, in order of how much setup
they need:

1. **`pg_cron`** (a Postgres extension, available on Supabase's hosted
   plans): schedule a daily job that runs
   `insert into public.inventory_snapshots (snapshot_date, total_units, total_value) select current_date, coalesce(sum(quantity_on_hand),0), coalesce(sum(quantity_on_hand * unit_price),0) from public.medicines;`
2. **A scheduled Edge Function**, if `pg_cron` isn't available on your
   plan — same query, run from a function on a cron trigger instead of
   inside Postgres.

Either way, this hasn't been built yet — it's the one piece of "Dashboard
data" that's a genuinely open task, not just an unwired screen.

---

## Frontend integration

Install the client library:

```bash
cd frontend
npm install @supabase/supabase-js
```

Add to `frontend/.env.local` (create it if it doesn't exist — it's
gitignored, same as `.env` was for the Django setup):

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key supabase start printed>
```

Create `frontend/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The "anon" key is safe to expose in browser code (hence NEXT_PUBLIC_) —
// it identifies the app, not a user; Row Level Security is what actually
// decides what any given request can read or write. The service_role key
// is a different, far more powerful credential and must NEVER appear here
// — it belongs only in the Edge Function's own environment.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Login screen (`app/page.tsx`)

Replace `handleSignIn`'s body:

```tsx
async function handleSignIn() {
  if (!email.trim() || !password.trim()) {
    setError("Enter your work email and password.");
    return;
  }
  setError("");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    setError("Incorrect email or password.");
    return;
  }
  router.push("/dashboard");
}
```

### Hospital Portal (`app/hospital-portal/page.tsx`)

This one calls the Edge Function, then has to explicitly load the returned
tokens into the client — `functions.invoke` doesn't automatically establish
a session the way `signInWithPassword` does:

```tsx
async function handleContinue() {
  if (!facilityCode.trim() || !staffId.trim()) {
    setError("Facility code and staff ID are both required.");
    return;
  }
  setError("");

  const { data, error: fnError } = await supabase.functions.invoke("hospital-login", {
    body: { facility_code: facilityCode, staff_id: staffId },
  });

  if (fnError || !data?.access_token) {
    setError("No account matches that facility code and staff ID.");
    return;
  }

  // The function returned real tokens, but the browser's Supabase client
  // doesn't know about them yet — this line is what actually logs the
  // user in on the frontend.
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  router.push("/dashboard");
}
```

### Forgot Password (`app/forgot-password/page.tsx`)

```tsx
async function handleSend() {
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  if (!looksLikeEmail) {
    setError("Enter a valid work email address.");
    return;
  }
  setError("");

  // Supabase always returns success here regardless of whether the email
  // is registered — same reasoning as the Django version had: this
  // response shouldn't be usable to find out who has an account.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://localhost:3000/reset-password",
  });

  setSent(true);
}
```

That `redirectTo` page (where someone actually sets a new password after
clicking the emailed link) doesn't exist yet — it's a new screen, not
covered by the current auth-pages guide. Worth adding to Part 2 or 3.

---

## What's still open

- **SSO** — not built. Supabase's `signInWithOAuth()` makes the mechanics
  easier once there's a decision, but picking and configuring an actual
  identity provider (Google? Microsoft/Azure AD, common for hospital orgs?)
  is still a real conversation to have, not something this migration
  settles.
- **The password-reset landing page** (`/reset-password`) that
  `resetPasswordForEmail`'s email link points at — needs building.
- **The dashboard screen itself is still reading `lib/mock-data.ts`** —
  the tables/views above exist now, but nobody's replaced the mock-data
  imports in `app/(app)/dashboard/page.tsx` and its components with real
  `supabase.from(...)` calls yet. That's a frontend task, not a schema one.
- **`inventory_snapshots` has nothing populating it** — see "Populating
  inventory_snapshots" above; needs `pg_cron` or a scheduled Edge Function,
  neither set up yet.
- **Custom business logic beyond auth and stock movement** (anything past
  what's in this migration) still needs somewhere to live — either a
  Postgres function/trigger (like the role-escalation guard, or
  `apply_stock_transaction`/the notification triggers here), an Edge
  Function, or, if the team ends up wanting non-trivial logic in Python
  specifically, a small separate service talking to the same Postgres
  database. Nothing here rules that out later — it's a "cross that bridge
  when a real feature needs it" situation, same as FastAPI was in the
  Django version of this backend.

---

## App pages data

`20260930000000_app_pages_schema.sql` is purely additive (it never edits the
two earlier migrations; where a check constraint or function must change it
drops/replaces it by name) and makes the backend cover all eight app pages.
`seed.sql` was extended to mirror the frontend mocks in `frontend/lib/mock/*.ts`.

### Page → tables/views → RLS

| Page | Read from | Key columns | RLS summary |
| --- | --- | --- | --- |
| Medicine | view `medicine_inventory` (list + featured cards); write `medicines` | `generic_name`, `batch_number` (free text, non-empty), `barcode` (12–14 digits), `storage_location`, `temperature_condition` (`room_temp`/`refrigerated`/`frozen`), `reorder_point` (> 0), `unit_price` (= form "unit cost"), computed `stock_status`, `supplier_name`, `days_to_expiry` | read: any signed-in user; write `medicines`: administrators only (unchanged) |
| Suppliers | view `supplier_directory`; write `suppliers` | `featured_tier` (`primary`/`secondary`/`urgent`/null), `rating` (0–5), `supplier_type`, `sku_count`, `total_orders`, `active_orders` (pending/approved/delayed), `last_delivery` | read: any signed-in; write: administrators only (unchanged) |
| Transactions | view `transaction_feed` (table + Live Timeline); write `stock_transactions` | `reference` (`TX-94821`), types `stock_in`/`stock_out`/`damaged`/`return`/`expired`, `department`, `batch_number`, `performed_by_name`; quantity always positive | read: any signed-in; insert: any signed-in **as themselves** (`performed_by = auth.uid()`, defaults to it); no update/delete |
| Orders | view `purchase_order_stats`; tables `purchase_orders`, `purchase_order_items` | `po_number` (auto `PO-2026-00129`…), `total_amount` (trigger-summed), `priority` (`normal`/`high`/`critical`), status now incl. `approved`, `approved_by`/`approved_at` (auto-stamped), items `quantity`, `unit_cost`, generated `line_total` | read: any signed-in; POs: administrators all, pharmacists/managers may create `pending` POs, managers may update; items: administrators any, pharmacists/managers only while the PO is `pending` |
| Reports | views `monthly_expenditure`, `inventory_value_by_category`, `supplier_performance`, `stock_turnover_monthly`; table `reports` | see view comments; `reports.slug` = `low-stock-report`, `expiry-forecast`, `inventory-valuation` | read: any signed-in; write `reports`: administrators |
| Users | table `profiles`, view `user_stats`, function `touch_last_login()` | `email`, `is_active`, `last_login_at`, `permissions text[]`, role now incl. `manager`; stats: `admins`, `pharmacists`, `managers`, `pending`, `total_active` | own row read/update (guarded); administrators read + update all; non-admins cannot change `role`/`is_active`/`permissions`/`email` |
| Settings | table `user_settings` | `email_alerts`, `low_stock_alerts`, `expiry_notifications`, `weekly_summary`, `two_factor_enabled`, `theme`, `accent_color` | each user reads/inserts/updates only their own row; row auto-created at sign-up |
| Logs | table `activity_logs` | `user_label`, `category`, `action`, `entity_type`, `entity_label`, `ip_address`, `result`, `created_at` | administrators read all; users read their own; **no** client insert/update/delete |

Every new table has RLS enabled and every new view is `security_invoker`
(`select count(*) from pg_class where relkind='r' and not relrowsecurity` in
`public` returned 0). Each policy carries a comment in the migration saying why.

### Decisions worth knowing

- **Existing recursion bug fixed.** The first migration's "administrators read
  all" policy selected from `profiles` inside a policy on `profiles`. As a
  superuser that is invisible; as a real API role Postgres raises `infinite
  recursion detected in policy for relation "profiles"` — which would also have
  broken every older policy that checks the caller's role via `profiles`. It is
  reproduced in the test run and replaced with an `is_admin()` (SECURITY
  DEFINER) version. `current_app_role()` / `is_admin()` treat a deactivated
  user as having no role.
- **Role guard.** `prevent_role_self_escalation()` is rewritten: `service_role`,
  no-JWT sessions (seed, migrations, `psql`) and active administrators may change
  `role`, `is_active`, `permissions`, `email`; everyone else's changes to those
  columns are silently reverted (other columns in the same update, e.g.
  `full_name`, still go through) and a failed `security` line is logged.
- **Transaction reference.** `reference` is `'TX-' || nextval(seq)` from a
  sequence starting at 94800, filled by a BEFORE INSERT trigger; existing rows
  are backfilled oldest first. The UI adds the `#`. Sequence gaps are normal
  (rolled-back inserts still consume numbers). `quantity` stays positive; the
  sign comes from `type` (`stock_in`/`return` add; `stock_out`/`damaged`/`expired`
  subtract) — a `quantity > 0` check (NOT VALID, so old rows aren't re-checked)
  stops a negative quantity flipping a stock-out into a stock-in.
- **PO numbers.** A BEFORE INSERT trigger fills a null `po_number` with
  `PO-<year>-<5 digits>` from a sequence starting at 129 (the year is the
  current year; the sequence does not reset annually). `total_amount` is
  maintained from the items; only set it by hand for an item-less order.
  Moving status to `approved` always stamps `approved_at = now()` and
  `approved_by = auth.uid()`; `delivered` stamps `delivered_at` and moves
  `suppliers.last_delivery_at` forward.
- **`stock_status` precedence** (`medicine_inventory`), first match wins:
  `low_stock` (qty ≤ reorder point) > `expiring_soon` (expiry ≤ today + 90
  days, which also includes already-expired rows — check `days_to_expiry < 0`)
  > `well_stocked` (qty ≥ 3 × reorder point) > `in_stock`. The mock frontend
  says "expiry within 30d"; this uses the 90 days from the brief, and the list
  can fold `well_stocked` into "In Stock".
- **Pending users** = `is_active = false AND last_login_at IS NULL`. Role
  counts (`admins`, `pharmacists`, `managers`) and `total_active` count active
  users only. `user_stats` runs under the caller's RLS, so only an administrator
  sees org-wide numbers.
- **Performer names** in `transaction_feed` come from `profile_display_name()`
  (definer, returns `full_name` only) so pharmacists can see who did what without
  being allowed to read other people's `profiles` rows (email, permissions).
- **Activity logs.** Triggers write a row for: medicine inserted, every stock
  transaction (result `success`/`warning`(pending)/`failed`(rejected)),
  PO created / status changed (approved, delivered, cancelled, delayed),
  profile `role`/`is_active`/`permissions` changed, supplier inserted (category
  `orders`), plus `touch_last_login()` (`security`, "User signed in") and blocked
  privilege changes. No auth session → `user_label = 'System'`, `user_id` null.
  `write_activity_log()` and `log_activity()` are executable by `service_role`
  only — a browser-callable logger would let anyone forge audit lines. IP comes
  from the `x-forwarded-for` request header when present. The Logs "role" column
  is `profiles.role` joined via `user_id`.
- **`is_active` is not a login gate.** Supabase Auth does not read it; it only
  affects `is_admin()`/`current_app_role()` and the policies built on them.
- **Reports.** `supplier_performance.fulfillment_rate` = delivered ÷ non-cancelled
  POs (delivery completion, not on-time). `stock_turnover_monthly` uses completed
  `stock_out` only (damaged/expired are wastage) over the month's average
  `inventory_snapshots.total_units`. Report card copy is stored verbatim,
  including the static "24 items" text; `low-stock-report` has a null
  `schedule_label` so the UI shows "Updated <time>" from `last_run_at`.
- **Frontend naming differences to map:** DB role `administrator` vs frontend
  `admin`; DB `slug` `low-stock-report` vs mock `low-stock`; PO date is
  `purchase_orders.created_at`, expected date is `expected_date`; supplier contact
  fields are `contact_name`/`contact_email`/`contact_phone`; status/priority
  values are lowercase in the DB.
- **Seed deviations.** The two role updates in the original seed are now
  wrapped in `alter table … disable/enable trigger` for the role guard (a stubbed
  `auth.uid()` otherwise blocks them). Metformin is inserted at 374 so its seeded
  transactions land on the mock's 480. Seeded turnover ratios are tiny (≈0.03)
  because seeded transactions are small next to the placeholder snapshot totals.
  `inventory_snapshots` is filled with a deterministic wave, not real data.

### What was tested

Against a scratch database on local Postgres 16.13, applying the auth stub,
`anon`/`authenticated`/`service_role` roles, the three migrations, then
`seed.sql`, all with `ON_ERROR_STOP` — and once more with the stub returning
`null` for `auth.uid()`/`auth.role()` to mimic Supabase's JWT-less seed run.
Then, using a non-superuser `authenticated` role and a settable `auth.uid()` so
RLS was really enforced:

- every new view returned sensible rows (medicine statuses, supplier
  directory counts, PO stats, 12-month expenditure, category value, fulfilment
  rates, turnover); the seeded orders total exactly R12,450.00 / R4,200.50 /
  R8,900.00 / R31,000.00 / R1,450.00;
- transaction references ran `TX-94800…` sequentially; each of the five types
  moved `quantity_on_hand` the right way (Metformin ends at 480);
- approving a PO stamped `approved_at`/`approved_by` (admin and manager);
  item insert/update/delete kept `total_amount` equal to the item sum; a
  null `po_number` became `PO-2026-00130` after the seed's 00129; the
  existing "delayed" notification still fired;
- the original recursive profiles policy errored under a real role and the
  replacement did not; a pharmacist could not change their own
  role/is_active/permissions/email (silently kept, full_name did change), an
  admin could change another user's, a bad permission value was rejected;
  `touch_last_login()` worked; `log_activity()` and direct `activity_logs`
  writes were denied to a pharmacist, who saw only their own log rows (admin
  saw all 57);
- `user_settings` existed for all five seed users; a user could not read,
  write or create another's row; bad accent colours were rejected;
- medicine/supplier/transaction check constraints rejected bad barcode,
  temperature, empty batch number, reorder point 0, rating 5.5, unknown tier,
  negative quantity.

**Not tested:** the real Supabase stack (PostgREST, GoTrue, JWT claims), so
`auth.role()`-based policies and the `anon` role were only exercised through the
stub; the `x-forwarded-for` IP capture (needs PostgREST headers); a migration run
over a database with pre-existing production data (the backfills are
straightforward but only ran on an empty one); the frontend itself (other agents
are wiring `lib/mock/*` in parallel).

### Still open

- **`inventory_snapshots` population job** — `pg_cron` or a scheduled Edge
  Function (see above). Reports' turnover and the dashboard trend depend on it.
- **Reset-password page** (`/reset-password`) — still not built.
- **SSO** — still not decided or built.
- **Storage bucket for avatars** — no bucket or policies yet.
- **Login gate for deactivated users** — `is_active` is not checked by Supabase
  Auth; needs a Hook or an Edge Function check if it must block sign-in.
- **Who may create medicines/suppliers** — still administrator-only (older
  policies); the Inventory Manager/Pharmacist roles may need write policies.
- **Real 2FA** — `two_factor_enabled` is only a preference flag.
- **Email sync** — `profiles.email` is copied at sign-up and not updated if the
  auth email later changes.
