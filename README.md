# 🎮 GankMeDaddy — Dota 2 Live Mid Coaching Agent

A lightweight Windows 11 system tray application that provides **real-time voice coaching** for mid lane play, using **pro player match data** and STRATZ pro guides as benchmarks.

## Features

- 🎯 **Real-time voice coaching** via offline high-quality neural Piper TTS with standard OneCore Speech fallback.
- 📊 **Data-driven benchmarks** from pro player STRATZ match history and STRATZ pro guides (item timings, GPM, KDA).
- 🎮 **Dota 2 Game State Integration** for live game telemetry (HP, mana, gold, items, abilities), locked down locally to `127.0.0.1`.
- 🏆 **9 mid heroes** with dedicated, robust strategy modules.
- 🔀 **Dynamic Build-Path Branching** — Automatically detects physical/magical item trajectories and filters advice dynamically.
- 🛡️ **Enemy Counter Briefings** — Pre-game analysis and counter tips for dangerous opponent heroes.
- ⏱️ **Rune/Lotus/Shrine timers** with voice reminders.
- 📈 **Creep score checkpoints** at 10/20/30 min vs pro player pace.
- 🔊 **Priority-based TTS queue** with interrupt protection and cooldown deduplication.
- ⚙️ **Lightweight System Tray** — Toggle hero pools, voice switch, setup GSI, or close the application.

## Supported Heroes

| Hero | ID | Strategy Module |
|---|---|---|
| Void Spirit | 126 | Power spikes, Dissimilate dodge, Astral Step rotations |
| Sniper | 35 | Positioning safety, Shrapnel rune control, Headshot harass |
| Shadow Fiend | 11 | Soul management, Raze combos, Eul's Requiem setup |
| Ember Spirit | 106 | Remnant safety, Chains+Fist combos, mana emergency |
| Storm Spirit | 17 | Mana management, level 6 spike, Overload weaving |
| Monkey King | 114 | Jingu trading, tree positioning, Wukong's Command |
| Queen of Pain | 39 | Blink+Scream harass, Sonic Wave kills, rune mobility |
| Zeus | 22 | Arc Lightning farming, global ult sniping, mana items |
| Kez | 145 | Katana vs Sai stance trade values, Falcon Blade rush, ultimate windows |

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure `.env`
The `.env` file should contain your STRATZ API token and Steam ID:
```
STRATZ_API_TOKEN=your_token_here
STEAM_ACCOUNT_ID=your_steam_id
```

### 3. Dota 2 Setup
Add `-gamestateintegration` to Dota 2's Steam launch options:
1. Open Steam → Right-click Dota 2 → Properties
2. In **Launch Options**, add: `-gamestateintegration`

The app will auto-copy the GSI config file to your Dota 2 directory on first run.

### 4. Run
```bash
npm start
```

The app will:
1. Initialize GSI Server on port 3001 (listening on localhost `127.0.0.1` only).
2. Load configuration and pre-fetch pro match data/STRATZ guides for enabled heroes in the background.
3. Show the system tray icon with status alerts.

---

## How It Works

```
Dota 2 Client (GSI) ───► GSIServer (Port 3001, localhost)
                                 │
                           MatchTracker
                                 │
                         CoachingEngine ◄─── STRATZ API (Topson / Pro Guide data)
                                 │
                           VoiceOutput (TTS)
```

1. **Dota 2 GSI** sends real-time game state to `127.0.0.1:3001` every 0.5s.
2. **Match Tracker** converts GSI data into normalized snapshots.
3.    **STRATZ Pro Analyzer** provides real item timing benchmarks from pro matches or fallback pro guides.
4. **Coaching Engine** evaluates general, build-path, counter, and hero-specific rules.
5. **Voice Output** plays speech via Windows SAPI or neural Piper TTS with queue deduplication.

---

## Architecture & Code Map

For a detailed breakdown of the components, read our **[Codemaps Index](file:///d:/GankMeDaddy/docs/CODEMAPS/INDEX.md)**.

```
src/
├── index.ts                   # Entry point and event coordinator
├── config/configManager.ts    # Settings persistence (%APPDATA%)
├── stratz/
│   ├── stratzClient.ts        # STRATZ GraphQL client with timeouts/retries
│   ├── proAnalyzer.ts         # Pro match & guide analyzer
│   └── queries.ts             # GraphQL queries
├── gsi/
│   ├── gsiServer.ts           # GSI HTTP server (localhost-only)
│   └── gsiTypes.ts            # TypeScript types for GSI
├── coaching/
│   ├── coachingEngine.ts      # Main coaching engine
│   ├── matchTracker.ts        # Match/draft orchestrator
│   ├── heroesData.ts          # Static hero index metadata
│   └── types.ts               # Shared types
├── strategies/                # Hero-specific strategy modules
│   ├── index.ts
│   ├── voidSpiritStrategy.ts
│   ├── sniperStrategy.ts
│   ├── shadowFiendStrategy.ts
│   ├── emberSpiritStrategy.ts
│   ├── stormSpiritStrategy.ts
│   ├── monkeyKingStrategy.ts
│   ├── queenOfPainStrategy.ts
│   ├── zeusStrategy.ts
│   └── kezStrategy.ts
├── voice/voiceOutput.ts       # Offline Piper & OneCore TTS manager
└── tray/trayApp.ts            # System tray UI controller
```

## License

Private use only. Built for George Popescu.
