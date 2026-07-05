# Frontend & User Interface Codemap

**Last Updated:** 2026-07-05
**Entry Points:** 
- [public/dashboard.html](file:///d:/GankMeDaddy/public/dashboard.html)
- [src/tray/trayApp.ts](file:///d:/GankMeDaddy/src/tray/trayApp.ts)

This codemap covers GankMeDaddy's user interfaces: the manual Draft Matchup Dashboard (web-based) and the system tray controller (native desktop UI).

---

## 1. Web Matchup Dashboard

The dashboard provides a visual draft screen to select Radiant and Dire matchups and designate the user's hero when configuring the coach manually.

### Directory Structure
```
public/
├── dashboard.html   # Markup and modals (hero list & slot actions)
├── dashboard.css    # Responsive grid styles & glassmorphism dark theme
└── dashboard.js     # State sync, API integration, and rendering
```

### Key Features
- **Responsive Hero Grid**: Displays all Dota 2 heroes grouped by attributes (Strength, Agility, Intelligence, Universal).
- **Glassmorphism Design**: High-end dark theme using backdrop filters, glowing color accents (emerald for Radiant, red for Dire, purple for the active player hero), andOutfit/Inter typography.
- **Slot Modals**: Clicking any hero slot opens a context modal permitting the user to assign/reassign that hero as "My Hero" or remove them from the draft.
- **Auto-Syncing**: Periodically polls the GSI server (`/health` and `/api/matchup`) to display real-time hero setups and state connection status.

---

## 2. Desktop System Tray App

`TrayApp` uses the lightweight `systray2` library to render a desktop menu containing hero pool configs and system statuses.

### Modules and Callbacks

| Component | Path | Purpose |
|---|---|---|
| **TrayApp Class** | [src/tray/trayApp.ts](file:///d:/GankMeDaddy/src/tray/trayApp.ts) | Initializes, starts, and kills the tray menu; parses clicks. |
| **TrayCallbacks** | Interface in `trayApp.ts` | Dispatches actions to `index.ts` (toggling heroes, voice state, testing voice, launching GSI setups, opening web dashboard, quitting). |

### Menu Layout and Seq ID Mapping

When items are clicked, `systray2` returns a 0-indexed `seq_id` mapping to the items list. Since hero options are dynamic, subsequent indices are calculated dynamically relative to `heroCount` (`SUPPORTED_HERO_IDS.length`):

- **Index 0**: Status display (disabled)
- **Index 1**: "Open Web Dashboard" (opens `http://localhost:3001/dashboard.html` in default browser)
- **Index 2**: Separator
- **Indices 3 to (3 + heroCount - 1)**: Hero checklist (toggles active pool status in config)
- **Index (3 + heroCount)**: Separator
- **Index (3 + heroCount + 1)**: Voice Switch (ON/OFF)
- **Index (3 + heroCount + 2)**: Aggression Indicator
- **Index (3 + heroCount + 3)**: Separator
- **Index (3 + heroCount + 4)**: Setup GSI Config
- **Index (3 + heroCount + 5)**: Test Voice Trigger
- **Index (3 + heroCount + 6)**: Separator
- **Index (3 + heroCount + 7)**: Quit Option

---

## Related Codemaps
- **[Coaching Engine & API Backend](file:///d:/GankMeDaddy/docs/CODEMAPS/backend.md)**
- **[External Integrations](file:///d:/GankMeDaddy/docs/CODEMAPS/integrations.md)**
