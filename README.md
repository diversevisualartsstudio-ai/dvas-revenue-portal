# DVAS Revenue Portal

Mobile-first revenue dashboard and landing-page foundation for Diverse Visual Arts Studio LLC.

## Run locally

Serve the repository root with `python3 -m http.server 8000`, then open <http://localhost:8000>. The portal displays clearly labeled sample data until configured with Supabase.

## Dashboard UX

The current interface includes responsive layouts, revenue time ranges and chart, pipeline stage summaries, opportunity search/filter/sort, loading and retry states, empty states, a dark/light theme toggle, and keyboard/screen-reader affordances. The included sample data is illustrative and must not be presented as company financial results.

## Connect Supabase

1. Apply `supabase/migrations/202611120001_initial_schema.sql` to your Supabase project.
2. Add the project URL, publishable/anon key, and organization UUID to `config.js`.
3. Set up Supabase Auth users and bootstrap the first organization/admin through a trusted server-side process. Configure redirect URLs and verify RLS policies before inviting users.
4. Open the dashboard and sign in. The UI queries `clients`, `opportunities`, `revenue_records`, and `security_checks` for the configured organization.

`config.js` contains browser-safe public configuration only. Never put a Supabase service-role key, Stripe secret, CRM token, or any other integration secret in client-side files. RLS is essential; the public/anon key alone is not data access protection.

## Data and deployment safety

This is a static frontend; a Supabase schema and client-side reads are not a complete production backend or admin-entry workflow. The UI currently supports read-only data views and email/password sign-in. Admin editing, integration connectors, production monitoring, automated accessibility checks, and end-to-end testing still need implementation. GitHub Pages is public hosting: do not publish real financial or customer data there. Host the authenticated dashboard on an appropriate private app deployment and test authorization before use.
