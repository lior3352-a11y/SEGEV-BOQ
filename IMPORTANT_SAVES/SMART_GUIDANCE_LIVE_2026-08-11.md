# SEGEV BOQ — IMPORTANT SAVE POINT

Date: 2026-08-11

This branch preserves the live SEGEV BOQ state immediately after Smart Guidance was integrated into the live loader.

## Included
- Live SEGEV BOQ application state from `main`
- `smart-guidance.js`
- Loader integration in `app.html`
- Dismissible non-critical guidance
- `Do not show again` support for non-critical guidance
- Critical blocking guidance for selected financial / contractual / permission mistakes

## Recovery references
- Archive branch: `archive/smart-guidance-live-2026-08-11`
- Pre-integration backup branch: `backup/pre-smart-guidance-live`

## Important rule
Critical guidance may block unsafe or unauthorized actions. Informational guidance must remain dismissible so users are not forced into an intrusive experience.
