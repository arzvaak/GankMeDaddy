# Frontend & Desktop UI Codemap

**Last Updated:** 2026-07-30
**Entry Points:** `src/electron/main.ts`, `src/electron/preload.ts`, `src/renderer/index.html`

GankMeDaddy uses Electron for its Windows dashboard and native system tray. The coaching engine remains in the main process; the renderer receives only a narrow, context-isolated API from the preload bridge.

## Components

| Component | Path | Purpose |
|---|---|---|
| Electron main process | `src/electron/main.ts` | Owns the window, tray, encrypted token storage, file picker, lifecycle, and IPC handlers. |
| Preload bridge | `src/electron/preload.ts` | Exposes the allow-listed `window.gank` methods without enabling Node.js in the page. |
| Renderer | `src/renderer/` | Implements Overview, automatic Draft Assistant, Hero Pool, and Setup screens with local HTML, CSS, JavaScript, and bundled hero portraits. |
| Runtime coordinator | `src/app/GankMeDaddyApp.ts` | Connects UI actions to GSI, STRATZ, match tracking, coaching, and voice services. |

## Security Boundary

- `contextIsolation` and Chromium sandboxing are enabled.
- `nodeIntegration` is disabled.
- External navigation is blocked; approved HTTPS links open in the user's browser.
- The STRATZ token is encrypted with Electron `safeStorage` where the operating system supports it.
- The renderer receives only `tokenConfigured: true/false`, never the saved token.
- Dota telemetry remains bound to `127.0.0.1`.

## Renderer Events

The main process sends three event types through the preload bridge:

- `runtime:state` — lifecycle, connection, match, hero, status, and error state.
- `runtime:snapshot` — current health, mana, K/D/A, last hits, GPM, level, items, and related telemetry.
- `runtime:activity` — user-readable background events such as STRATZ preload and GSI installation.
- `runtime:draft` — normalized automatic team picks and the latest ranked counter-pick recommendations.

## Automatic Draft Assistant

`src/coaching/draftAssistant.ts` consumes the GSI `draft` object, infers the player's side, excludes picked/banned heroes, filters candidates to the selected position and enabled coaching pool, then combines direct and full-draft matchup performance. Matchup rows are fetched from OpenDota once and kept in memory so updates during the pick timer are immediate. The renderer has no manual hero-entry controls.

## Guided Setup

The setup page is a resumable six-step tutorial covering prerequisites, STRATZ, Steam account identification, Dota folder validation, GSI installation, the Steam launch option, and a final readiness check. `bootstrap()` returns individual requirement flags so the overview and tutorial share one source of truth.

## Bundled Visuals

Original WebP artwork lives in `src/renderer/assets/` and is packaged inside the application archive. Lucide provides the interface icon system; the renderer does not load images, fonts, icons, or scripts from a CDN.

## Packaging

`electron-builder` creates an NSIS installer. Compiled code and renderer files live in the application archive; Piper and its model are copied to `resources/bin` so the executable can launch them at runtime.

Use `npm run verify` for the compiled Electron renderer/bridge smoke test and `npm run dist:win` for the Windows installer.

## Related Codemaps

- [Coaching Engine & API Backend](backend.md)
- [External Integrations](integrations.md)
