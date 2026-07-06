# Frontend & User Interface Codemap

**Last Updated:** 2026-07-06
**Entry Points:** 
- [src/tray/trayApp.ts](file:///d:/GankMeDaddy/src/tray/trayApp.ts)

This codemap covers GankMeDaddy's user interface: the system tray controller (native desktop UI).

---

## Desktop System Tray App

`TrayApp` uses the lightweight `systray2` library to render a desktop menu containing hero pool configs and system statuses.

### Modules and Callbacks

| Component | Path | Purpose |
|---|---|---|
| **TrayApp Class** | [src/tray/trayApp.ts](file:///d:/GankMeDaddy/src/tray/trayApp.ts) | Initializes, starts, and kills the tray menu; parses clicks. |
| **TrayCallbacks** | Interface in `trayApp.ts` | Dispatches actions to `index.ts` (toggling heroes, voice state, testing voice, launching GSI setups, quitting). |

### Menu Layout and Seq ID Mapping

When items are clicked, `systray2` returns a 0-indexed `seq_id` mapping to the items list. Since hero options are dynamic, subsequent indices are calculated dynamically relative to `heroCount` (`SUPPORTED_HERO_IDS.length`):

- **Index 0**: Status display (disabled)
- **Index 1**: Separator
- **Indices 2 to (2 + heroCount - 1)**: Hero checklist (toggles active pool status in config)
- **Index (2 + heroCount)**: Separator
- **Index (2 + heroCount + 1)**: Voice Switch (ON/OFF)
- **Index (2 + heroCount + 2)**: Aggression Indicator
- **Index (2 + heroCount + 3)**: Separator
- **Index (2 + heroCount + 4)**: Setup GSI Config
- **Index (2 + heroCount + 5)**: Test Voice Trigger
- **Index (2 + heroCount + 6)**: Separator
- **Index (2 + heroCount + 7)**: Quit Option

---

## Related Codemaps
- **[Coaching Engine & API Backend](file:///d:/GankMeDaddy/docs/CODEMAPS/backend.md)**
- **[External Integrations](file:///d:/GankMeDaddy/docs/CODEMAPS/integrations.md)**
