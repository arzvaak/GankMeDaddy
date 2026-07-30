# Frontend & Desktop UI Codemap

**Last Updated:** 2026-07-30
**Entry Points:** `src/electron/main.ts`, `src/electron/preload.ts`, `src/renderer/index.html`

GankMeDaddy uses Electron for its Windows dashboard and native system tray. The coaching engine remains in the main process; the renderer receives only a narrow, context-isolated API from the preload bridge.

## Components

| Component | Path | Purpose |
|---|---|---|
| Electron main process | `src/electron/main.ts` | Owns the window, tray, encrypted token storage, file picker, lifecycle, and IPC handlers. |
| Preload bridge | `src/electron/preload.ts` | Exposes the allow-listed `window.gank` methods without enabling Node.js in the page. |
| Renderer | `src/renderer/` | Implements Overview, Hero Pool, and Setup screens with local HTML, CSS, and JavaScript. |
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

## Packaging

`electron-builder` creates an NSIS installer. Compiled code and renderer files live in the application archive; Piper and its model are copied to `resources/bin` so the executable can launch them at runtime.

Use `npm run verify` for the compiled Electron renderer/bridge smoke test and `npm run dist:win` for the Windows installer.

## Related Codemaps

- [Coaching Engine & API Backend](backend.md)
- [External Integrations](integrations.md)
