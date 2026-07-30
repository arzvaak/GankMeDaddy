# Frontend & User Interface Codemap

**Last Updated:** 2026-07-30
**Entry Points:**
- [src/tray/trayApp.ts](file:///d:/GankMeDaddy/src/tray/trayApp.ts)

This codemap covers GankMeDaddy's user interface: the system tray controller (native desktop UI).

---

## Desktop System Tray App

`TrayApp` uses the lightweight `systray2` library to render a desktop menu containing position selection, volume controls, and system statuses.

### Modules and Callbacks

| Component | Path | Purpose |
|---|---|---|
| **TrayApp Class** | [src/tray/trayApp.ts](file:///d:/GankMeDaddy/src/tray/trayApp.ts) | Initializes, starts, and kills the tray menu; parses clicks. |
| **TrayCallbacks** | Interface in `trayApp.ts` | Dispatches actions to `index.ts` (setting position, toggling voice, adjusting volume, testing voice, launching GSI setups, quitting). |

### Callback Interface

```typescript
export interface TrayCallbacks {
  onSetPosition: (role: Role) => void;   // 'mid' | 'pos1' | 'pos3' | 'pos4' | 'pos5'
  onToggleVoice: () => void;
  onAdjustVolume: (delta: number) => void; // +/- 10
  onSetupGSI: () => void;
  onTestVoice: () => void;
  onQuit: () => void;
}
```

### Menu Layout and Seq ID Mapping

The menu has a fixed 18-item layout (no dynamic hero items):

| Index | Item | Type |
|---|---|---|
| 0 | `Status: ...` | Disabled label |
| 1 | `Position: <role>` | Disabled label |
| 2–6 | Position radio buttons (pos1, mid, pos3, pos4, pos5) | Clickable radio |
| 7 | Separator | Disabled |
| 8 | Voice ON/OFF | Toggle |
| 9 | Aggression: X/10 | Disabled label |
| 10 | Volume bar + percentage | Disabled label |
| 11 | ▲ Volume Up (+10) | Button |
| 12 | ▼ Volume Down (-10) | Button |
| 13 | Separator | Disabled |
| 14 | Setup GSI Config | Button |
| 15 | Test Voice | Button |
| 16 | Separator | Disabled |
| 17 | Quit | Button |

### Volume Bar Rendering

The helper `volumeBar(vol: number)` converts a 0–100 value into a 10-segment Unicode bar: `▰▰▰▰▰▰▰▰○○` for 80%.

### Position Constants

```typescript
const POSITION_ORDER: Role[] = ['pos1', 'mid', 'pos3', 'pos4', 'pos5'];

const POSITION_LABELS: Record<Role, string> = {
  pos1: 'Safe Lane (Pos 1)',
  mid: 'Mid Lane (Pos 2)',
  pos3: 'Offlane (Pos 3)',
  pos4: 'Soft Support (Pos 4)',
  pos5: 'Hard Support (Pos 5)',
};
```

---

## Related Codemaps
- **[Coaching Engine & API Backend](file:///d:/GankMeDaddy/docs/CODEMAPS/backend.md)**
- **[External Integrations](file:///d:/GankMeDaddy/docs/CODEMAPS/integrations.md)**
