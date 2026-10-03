# SEGEV BOQ Commercial v1.0

Commercial Windows packaging layer for SEGEV BOQ.

## Customer flow
1. Download `SEGEV_BOQ_Setup_1.0.0.exe`.
2. Run the standard Windows installer.
3. SEGEV BOQ is installed with Start Menu and Desktop shortcuts.
4. The application launches in its own desktop window.

## Build
On Windows:

```powershell
npm install
npm run dist
```

The installer is created under `dist/`.

## Important production gates
- The current workflow intentionally builds unsigned until a real Windows code-signing certificate is supplied.
- A tamper-resistant commercial licensing system requires a server-side licensing API. Packaging HTML inside Electron does not secure local-only license checks.
- Do not replace the live customer version until the installer artifact is tested on a clean Windows machine.
