# 🎮 GankMeDaddy — Dota 2 Live Mid Coaching Agent

A lightweight Windows 11 tray app that provides **real-time voice coaching** for mid lane play, using **Topson's actual match data** from STRATZ as benchmarks.

## Features

- 🎯 **Real-time voice coaching** via Windows SAPI (local, offline, zero latency)
- 📊 **Data-driven benchmarks** from Topson's actual STRATZ match history (item timings, GPM, KDA)
- 🎮 **Dota 2 Game State Integration** for live game data (HP, mana, gold, items, abilities)
- 🏆 **8 mid heroes** with dedicated strategy modules (easily extensible)
- ⏱️ **Rune/Lotus/Shrine timers** with voice reminders
- 📈 **Creep score checkpoints** at 10/20/30 min vs Topson's pace
- 🔊 **Priority-based TTS queue** with cooldown deduplication (no spam)
- 🖥️ **Lightweight system tray** — no Electron, no browser, minimal resources

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

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure `.env`
The `.env` file should already contain your STRATZ API token and Steam ID:
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
1. Load item constants from STRATZ
2. Pre-fetch Topson's match data for all enabled heroes
3. Start the GSI server on port 3001
4. Show a system tray icon
5. Wait for you to start a Dota 2 match

## How It Works

```
Dota 2 Client → GSI (HTTP POST) → GankMeDaddy → Voice Coaching
                                       ↕
                                  STRATZ API
                              (Topson benchmarks)
```

1. **Dota 2 GSI** sends real-time game state to `localhost:3001` every 0.5s
2. **Match Tracker** converts GSI data into typed `MatchSnapshot` objects
3. **STRATZ Topson Analyzer** provides real item timing benchmarks from Topson's actual matches
4. **Coaching Engine** runs general + hero-specific rules against each snapshot
5. **Voice Output** speaks recommendations via Windows SAPI with priority queue

## Adding New Heroes

1. Create `src/strategies/newHeroStrategy.ts` implementing `HeroStrategy`
2. Add the hero ID to `HERO_IDS` in `src/coaching/types.ts`
3. Register it in `src/strategies/index.ts`
4. Done — Topson data and general rules apply automatically

## Architecture

```
src/
├── index.ts                   # Entry point
├── config/configManager.ts    # Settings persistence (%APPDATA%)
├── stratz/
│   ├── stratzClient.ts        # STRATZ GraphQL client
│   ├── topsonAnalyzer.ts      # Topson match data analysis
│   └── queries.ts             # GraphQL queries
├── gsi/
│   ├── gsiServer.ts           # Dota 2 GSI HTTP server
│   └── gsiTypes.ts            # TypeScript types for GSI
├── coaching/
│   ├── coachingEngine.ts      # Main coaching logic
│   ├── matchTracker.ts        # Match orchestration
│   └── types.ts               # Shared types
├── strategies/                # Hero-specific modules
│   ├── index.ts               # Strategy registry
│   ├── voidSpiritStrategy.ts
│   ├── sniperStrategy.ts
│   ├── shadowFiendStrategy.ts
│   ├── emberSpiritStrategy.ts
│   ├── stormSpiritStrategy.ts
│   ├── monkeyKingStrategy.ts
│   ├── queenOfPainStrategy.ts
│   └── zeusStrategy.ts
├── voice/voiceOutput.ts       # Windows SAPI TTS
└── tray/trayApp.ts            # System tray UI
```

## License

Private use only. Built for George Popescu.
