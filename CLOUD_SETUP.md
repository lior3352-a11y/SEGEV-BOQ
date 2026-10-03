# SEGEV BOQ contractor preview

`/customer.html` is a new, clean contractor workspace. It starts at zero projects; the contractor can add a project and BOQ rows, see budget versus actual cost, and click **AI** to ask about the saved data. No fixed demo answers or sample project data are loaded. Existing `/app.html` remains unchanged while this preview is configured and tested.

## Enable the preview

1. Link this repository to the existing `segev-boq` Vercel project. Provision a separate Neon database for SEGEV BOQ and set `DATABASE_URL` in its Preview environment. Apply `db/schema.sql`.
2. Configure encrypted `SEGEV_ADMIN_EMAIL` and a new `SEGEV_ADMIN_PASSWORD` in Preview. Do not reuse the password exposed in the older public demo source.
3. Configure encrypted `GEMINI_API_KEY` in Preview. `GEMINI_MODEL` can override the default `gemini-3.8-flash`. Redeploy after changing environment variables.
4. Open the preview URL ending `/customer.html` on a desktop computer. Sign in, create a project, add BOQ items, and ask AI a question about them. Open the same preview URL on the phone and sign in with the same account to see the saved project.

This preview has a single contractor-owner account configured by environment variables. It does **not** include self-service signup, separate customer companies, billing, plan enforcement, user roles, upload of plans/BOQ, password recovery, or private client portals. Those are required before selling this as multi-customer software. The assistant sends that account's project and BOQ data to the configured Gemini API; it returns “no data” when there are no projects and never falls back to a fabricated answer.

The original browser-local app and its data are not modified or automatically imported. Export a backup there before migration.
