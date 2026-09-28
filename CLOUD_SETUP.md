# SEGEV BOQ cloud preview

This is a separate admin-only cloud preview at `/cloud.html`. The existing GitHub Pages `/app.html` remains unchanged. The old browser-local login is not a secure commercial account system; do not reuse its publicly exposed demo password as `SEGEV_ADMIN_PASSWORD`.

## Provision

1. Link this repository to the existing `segev-boq` Vercel project. Provision an isolated Neon Postgres database for this project, and set `DATABASE_URL` for Preview and Production.
2. Run `db/schema.sql` on that database once.
3. Set `SEGEV_ADMIN_EMAIL` and a **new, unique** `SEGEV_ADMIN_PASSWORD` as encrypted environment variables for Preview and Production. Redeploy after adding them.
4. Open the preview's `/cloud.html` on the computer containing the desired SEGEV BOQ browser data **first**, and sign in. On the first cloud login, the browser's locally stored project data is uploaded to the empty cloud workspace. Then sign in on the phone at the *same Vercel origin* to load that workspace.

The page requires a server at the same origin; GitHub Pages cannot run `/api/*`. Existing demo buyer/license actions are hidden in this admin preview and are not migrated to secure shared customer accounts. The cloud work covers the administrator's data and sign-in on multiple devices only. No passwords or license codes are uploaded in the workspace. Changes to workspace data are saved with a revision check; a conflicting write stops and asks the user to make a backup before refreshing.

Before migration, use the existing “יצא גיבוי” button on `/app.html` to save a JSON copy. Current demo data remains in the original browser and is not deleted by this change.
