# Commit guide — Supabase wiring

Nothing has been committed for you. Run these steps yourself from Git Bash or
the VS Code terminal.

## Where things stand

- You're on `main`. The README rule is: never push straight to `main`.
- Local `main` is 14 commits ahead of GitHub and 8 behind, so a plain
  `git push` will be rejected.
- `witch main` in the repo root is a stray file. Don't commit it.
- `frontend/.env.local` is gitignored. Never commit it.
- This guide (`COMMIT-GUIDE.md`) isn't meant to be committed either.

## 1. Make a branch

Uncommitted changes come along with it.

```bash
cd C:/Users/TTK/MediStock-IMS-
git switch -c feat/supabase-wiring
```

## 2. Commit in two parts

```bash
# Backend
git add supabase/
git commit -m "db: add notification read RPC and invite-user edge function"

# Frontend
git add frontend/
git status   # make sure `witch main` and .env.local are NOT staged
git commit -m "feat: connect all pages to Supabase and remove mock data"
```

## 3. Merge in GitHub's 8 commits

```bash
git fetch origin
git merge origin/main
```

Expect conflicts. Resolve them like this:

| Conflict | Command | Why |
|---|---|---|
| `frontend/src/...` ("deleted by us") | `git rm <file>` | Thama-7's changes there were already moved into the new `app/` layout |
| `frontend/package.json`, `frontend/package-lock.json` | `git checkout --ours <file>`, then `npm install` in `frontend/` | Yours already includes `@supabase/supabase-js` |
| `supabase/functions/hospital-login/index.ts` | `git checkout --ours <file>` | Yours already has the CORS headers |
| `supabase/migrations/20260930000000_app_pages_schema.sql` | `git checkout --ours <file>` | The frontend is built against this version (see below) |

Then check everything still builds and finish the merge:

```bash
git add -A frontend supabase
cd frontend
npx tsc --noEmit
npm run lint
cd ..
git commit
```

## 4. Push and open a pull request

```bash
git push -u origin feat/supabase-wiring
```

On GitHub, open a pull request from `feat/supabase-wiring` into `main`.

## Settle these with the team before merging

1. **Two schema versions.** GitHub's `20260930000000_app_pages_schema.sql`
   renames many view columns (`user_stats`, `supplier_directory`,
   `purchase_order_stats`, the report views). It also makes
   `medicines.barcode` NOT NULL, which breaks the current `seed.sql`. The
   frontend works with the local version only. Pick one version.
2. **Edited migrations.** `20260908…init_schema.sql` and
   `20260922…dashboard_schema.sql` show as modified. The README says merged
   migrations must never be edited, so confirm which copy is correct.
3. **Stock-out clamping.** `apply_stock_transaction` floors stock at 0
   instead of rejecting a stock-out larger than what's on hand. The frontend
   now blocks this, but the trigger should probably raise an error.

## After merging

- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to
  `frontend/.env.local`.
- Run `supabase db push` to apply the new
  `20261008000000_notification_reads.sql` migration.
- Run `supabase functions deploy invite-user`. It hasn't been tested against a
  live project yet.
