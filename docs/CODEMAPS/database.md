# Data Config & Persistence Codemap

**Last Updated:** 2026-07-05
**Entry Point:** [src/config/configManager.ts](file:///d:/GankMeDaddy/src/config/configManager.ts)

GankMeDaddy stores active user preferences, selected hero lists, voice states, and system paths in a structured JSON configuration file.

---

## 1. Config Manager & Storage Location

The application saves user config settings in the local OS user data directory:
- **Path**: `%APPDATA%\gankmedaddy\config.json`
- **Fallback**: `./config.json` (if `%APPDATA%` is inaccessible)

---

## 2. Configuration Schema

```typescript
export interface AppConfig {
  configVersion: number;       // Current Schema Version (e.g. 2)
  dota2Path: string;           // Path to Steam/Dota 2 folder
  stratzToken: string;         // Personal STRATZ API Token
  voiceEnabled: boolean;       // Global Speech Announcer flag
  voiceRate: number;           // Playback speech rate multiplier (0.5 to 2.0)
  aggressionLevel: number;     // Configured coach aggression index (1 to 10)
  enabledHeroIds: number[];    // Hero IDs loaded by GankMeDaddy for coaching
  gsiPort: number;             // Port bound to GSI Express server (default: 3001)
}
```

---

## 3. Schema Migrations

To avoid configuration corruption when updating hero pools (e.g., adding Kez, ID 145), the manager executes migrations:

### Migration Path (Version 1 to 2)
- Checks the `configVersion` property of the loaded JSON.
- If missing or equal to `1`, updates the schema version to `2`.
- Verifies if Kez (ID `145`) is present in `enabledHeroIds`. If absent, automatically appends `145` to the list.
- Persists the updated JSON file safely back to the user directory.

---

## Related Codemaps
- **[Web Dashboard & Tray UI](file:///d:/GankMeDaddy/docs/CODEMAPS/frontend.md)**
- **[Coaching Engine & API Backend](file:///d:/GankMeDaddy/docs/CODEMAPS/backend.md)**
