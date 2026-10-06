MediStock IMS
=============
Hospital pharmacy Inventory Management System.
CMPG224 (NWU Software Engineering) group project
Repo: https://github.com/CMPG224/MediStock-IMS-

WHAT IS IN THIS REPO
  frontend/                    Next.js 16 app (React 19, Tailwind v4, TypeScript)
  supabase/                    Database + auth backend
      migrations/              3 SQL migrations (auth, dashboard, app pages)
      seed.sql                 Local test data and test accounts
      config.toml              Local Supabase config
      functions/hospital-login Edge Function for the Hospital Portal login
  SUPABASE-BACKEND-README.md   Backend setup details (same as supabase/README.md)

PAGES (frontend)
  Auth:  /  (sign in), /forgot-password, /hospital-portal, /sso
  App:   /dashboard /medicine /suppliers /transactions /orders
         /reports /users /logs /settings

STATUS
  - All pages are built to the Figma design system.
  - Pages currently run on MOCK DATA in frontend/lib/mock/. They are not yet
    connected to Supabase; each mock file names the table/view that replaces it.
  - The SQL was tested on a local PostgreSQL 16 with a stubbed auth schema,
    NOT on a live Supabase project.

RUN THE FRONTEND
  Requires Node.js 20+ and npm.
      cd frontend
      npm install
      npm run dev          # http://localhost:3000
  Checks before pushing:
      npx tsc --noEmit
      npm run lint
      npm run build

RUN THE BACKEND LOCALLY
  Requires the Supabase CLI and Docker.
      cd supabase
      supabase start
      supabase db reset    # applies all migrations + seed.sql
  Local test logins (from seed.sql, local development only):
      admin@medistock.test       / TestPass123!
      pharmacist@medistock.test  / TestPass123!
      Hospital Portal: facility WC-GEN-014, staff ID STF-0001

DESIGN RULES
  - Typeface is Inter (self-hosted via @fontsource/inter). Icons are Lucide.
  - Do not change the design system without agreement; the Figma export is the
    visual reference.

GIT RULES
  - Never push straight to main: use a branch (feat/..., fix/..., docs/..., db/...)
    and open a pull request.
  - Never commit .env files or the Supabase service_role key.
  - Never edit a merged migration; add a new, later-dated one.

DOCUMENTATION
  LaTeX guides are kept separately: a Frontend set (5 docs) and a Backend set (5 docs).
