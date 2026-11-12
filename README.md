# DVAS Revenue Portal

Static landing page and dashboard prototype for Diverse Visual Arts Studio LLC.

## Run locally

Open `index.html` in a browser, or serve the repository root:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Supabase backend foundation

A starter Postgres schema is in `supabase/migrations/202611120001_initial_schema.sql`. It defines organization-scoped clients, opportunities, revenue records, security checks, audit logs, roles, and row-level security policies. Supabase Auth provides user identity; the database policies restrict each user to organizations where they are a member.

### Setup

1. Create a Supabase project and install the Supabase CLI.
2. Link this repository to your project with `supabase link`.
3. Apply the migration with `supabase db push`.
4. Bootstrap the first organization and admin membership through a trusted, server-side process. Do not allow public signup to assign admin roles. The migration deliberately does not create a default organization or admin.
5. Configure authentication providers and allowed redirect URLs in the Supabase dashboard.
6. Connect the app using the Supabase project URL and publishable/anon key. Never put the service-role key in browser code.

This commits a database/auth foundation, not a fully connected UI: the existing `index.html` remains a static dashboard and still contains demonstration values. Replace those values with authenticated queries only after the project is configured, an initial admin is bootstrapped, and end-to-end authorization has been tested. Do not use real financial or customer data on public GitHub Pages.

## Data integrations

Stripe, Google Sheets, Airtable, and CRM/ERP providers require credentials and account-specific field mappings. Those credentials must be stored as server-side Supabase Function secrets, never committed to this repository or exposed in the browser. The current schema includes `source` and `external_ref` fields to support idempotent imports. Stripe and Airtable can be connected using their APIs; Google Sheets requires a service account or OAuth setup. “CRM/ERP” is not a single API—choose the specific vendor (for example, Salesforce, HubSpot, or NetSuite) and define field mappings before enabling a connector.

No external service is connected by this starter. Before enabling sync, implement and test each server-side connector, verify webhook signatures where applicable, restrict sync actions to admins, and decide how deletes, refunds, currency conversion, duplicate records, and historical imports should be handled.

## GitHub Pages deployment

The static site can be hosted on GitHub Pages after adding a Pages workflow and selecting **Settings → Pages → Build and deployment → GitHub Actions**. GitHub Pages publishes a public static site; it cannot protect sensitive dashboard data. Enable **Enforce HTTPS** in Pages settings once available. For a custom domain, configure the DNS records GitHub specifies, wait for certificate provisioning, then enable HTTPS.
