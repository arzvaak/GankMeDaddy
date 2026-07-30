# GankMeDaddy — Dota 2 Live Coaching Agent

A Windows 11 desktop application that provides **real-time voice coaching** for all five positions, using **role-aware pro player match data** and STRATZ pro guides as benchmarks.

## Features

- **Position & Lane-Specific Voice Coaching** — Real-time recommendations (runes, lotus pools, phase transitions, deaths, and HP/mana alerts) adapt dynamically to the player's active role and lane.
- **Role-Aware Professional Benchmarks** — Dynamically fetches and analyzes pro match history on STRATZ from top players representing each position.
- **Real-time voice coaching** via offline high-quality neural Piper TTS with standard OneCore Speech fallback. Volume adjustable (0-100) from the tray.
- **Dota 2 Game State Integration** for live game telemetry (HP, mana, gold, items, abilities), locked down locally to `127.0.0.1`.
- **32 heroes** across all 5 positions with dedicated, robust strategy modules.
- **Dynamic Build-Path Branching** — Automatically detects physical/magical item trajectories and filters advice dynamically.
- **Enemy Counter Briefings** — Pre-game analysis and counter tips for dangerous opponent heroes.
- **Rune/Lotus/Shrine timers** with voice reminders.
- **Creep score checkpoints** at 10/20/30 min vs pro player pace.
- **Priority-based TTS queue** with interrupt protection and cooldown deduplication.
- **Electron control center** — Live telemetry, position and voice controls, hero-pool management, secure first-run setup, and minimize-to-tray behavior.
- **Automatic Draft Assistant** — Reads revealed picks from the Dota window in Ranked All Pick, Unranked All Pick, and Turbo; ranks enabled heroes for the selected position; and explains lane and overall matchup strength using cached OpenDota matchup history.
- **Bundled hero portraits** — The complete portrait set is packaged locally for an instant, offline-safe draft display.
- **Guided match-ready tutorial** — Explains every required input, validates the Dota folder, installs GSI, provides the Steam launch option, and tracks readiness step by step.
- **Bundled original artwork** — A cohesive command-center visual system ships with the app and remains fully offline.

## Supported Heroes

### Mid (9)
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

### Pos 5 — Hard Support (4)
| Hero | ID | Strategy Module |
|---|---|---|
| Crystal Maiden | 5 | Mana aura, Frostbite farming, freezing field positioning |
| Lich | 31 | Frost Shield, Sinister Gaze, Chain Frost timing |
| Witch Doctor | 30 | Maledict kills, Cask bounces, Death Ward positioning |
| Warlock | 37 | Fatal Bonds, Shadow Word sustain, Golem timing |

### Pos 4 — Soft Support (5)
| Hero | ID | Strategy Module |
|---|---|---|
| Rubick | 86 | Spell steal priority, Telekinesis setup, Fade Bolt harass |
| Lion | 26 | Mana Drain, Earth Spike setup, Finger burst threshold |
| Hoodwink | 123 | Acorn Shot bushwhack, Scurry escape, Sharpshooter snipes |
| Earth Spirit | 107 | Rolling Boulder initiations, Magnetize spreads, Stone Remnant walls |
| Tusk | 100 | Snowball saves, Ice Shards blocking, Walrus Punch bursts |

### Pos 3 — Offlane (7)
| Hero | ID | Strategy Module |
|---|---|---|
| Axe | 2 | Berserker's Call blink, Helix farming, Culling Blade threshold |
| Tidehunter | 29 | Anchor Smash trading, Ravage blink, Gush slows |
| Sand King | 16 | Sand Storm escape, Caustic Finale farming, Epicenter blink |
| Centaur | 96 | Double Edge last hits, Stampede initiations, Return trading |
| Mars | 129 | Spear wall combo, Bulwark positioning, Arena of Blood ult |
| Dawnbreaker | 135 | Hammer throw trading, Global Presence saves, Celestial Hammer impact |
| Primal Beast | 137 | Trample uptime, Onslaught initiations, Pulverize ult |

### Pos 1 — Safelane Carry (7)
| Hero | ID | Strategy Module |
|---|---|---|
| Phantom Assassin | 44 | Dagger crit harass, Blur evasion, Coup de Grace burst |
| Faceless Void | 41 | Time Lock bash procs, Time Walk dodge, Chrono setups |
| Spectre | 67 | Desolate haunt, Spectral Dagger chase, Reality global pickoffs |
| Luna | 48 | Lucent Beam harass, Moon Glaive farm, Eclipse burst |
| Juggernaut | 8 | Blade Fury magic immunity, Healing Ward sustain, Omnislash kills |
| Morphling | 10 | Adaptive Strike combos, Waveform escape, Replicate morph |
| Troll Warlord | 95 | Fervor stack management, Whirling Axes blind, Battle Trance |

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Launch the desktop app

```bash
npm start
```

Open **Guided setup** in the app. It explains where to obtain a STRATZ token, which Steam account ID is required, how to locate the Dota folder, what the GSI file contains, and where to add the launch option. The token is protected with the operating system's credential encryption and is never sent to the renderer after it is saved.

### 3. Dota 2 Setup
Add `-gamestateintegration` to Dota 2's Steam launch options:
1. Open Steam → Right-click Dota 2 → Properties
2. In **Launch Options**, add: `-gamestateintegration`

Use **Install GSI config** in the desktop app to write the local integration file.

### 4. Build the Windows installer
```bash
npm run dist:win
```

The installer is written to `release/GankMeDaddy-1.2.0-x64.exe`. The installed app will:
1. Initialize GSI Server on port 3001 (listening on localhost `127.0.0.1` only) and keep the installed config upgraded with the `draft` channel.
2. Load configuration and pre-fetch pro match data/STRATZ guides for enabled heroes in the background.
3. Show the Electron dashboard and continue running from the system tray when the window is closed.

For the original terminal-only workflow, create `.env` with `STRATZ_API_TOKEN` and optionally `STEAM_ACCOUNT_ID`, then run `npm run start:cli`.

---

## How It Works

```
Dota 2 Client (GSI) ───► GSIServer (Port 3001, localhost)
                                 │
                           MatchTracker
                                 │
                         CoachingEngine ◄─── STRATZ API (Pro / Guide data)
                                 │
                           VoiceOutput (TTS)
```

1. **Dota 2 GSI** sends real-time game state to `127.0.0.1:3001` every 0.5s.
2. **Match Tracker** converts GSI data into normalized snapshots.
3. **Visual Draft Reader** captures only the Dota window during hero selection and recognizes the ten top-bar portraits locally. Frames are not stored or uploaded.
4. **Draft Assistant** resolves the local team and reranks position-valid heroes automatically after each revealed pick.
5. **STRATZ Pro Analyzer** provides position-specific benchmarks from representative professional players or falls back to STRATZ Pro Guides.
6. **Coaching Engine** evaluates general, build-path, counter, and hero-specific rules.
7. **Voice Output** plays speech via Windows SAPI or neural Piper TTS with queue deduplication.

## Automatic Draft Mode Support

| Mode | Automatic picks | Method |
|---|---:|---|
| Ranked All Pick | Yes | Local Dota-window recognition + GSI phase/team context |
| Unranked All Pick | Yes | Local Dota-window recognition + GSI phase/team context |
| Turbo | Yes | Local Dota-window recognition + GSI phase/team context |
| Captain's Mode spectator | Yes | Valve GSI draft feed |
| Ability Draft, Single Draft, Random Draft, custom layouts | Not certified | The pick layout and rules differ |

For reliable recognition, keep Dota visible and use **Borderless Window** at a 16:9 resolution. The reader never clicks in Dota, reads process memory, or modifies the game.

---

## Architecture & Code Map

For a detailed breakdown of the components, read our **[Codemaps Index](docs/CODEMAPS/INDEX.md)**.

```
src/
├── electron/                  # Desktop window, native tray, and secure IPC bridge
├── renderer/                  # Dashboard, hero pool, and setup interface
├── app/GankMeDaddyApp.ts      # Reusable coaching runtime coordinator
├── index.ts                   # Optional terminal-only entry point
├── config/configManager.ts    # Settings persistence (%APPDATA%)
├── stratz/
│   ├── stratzClient.ts        # STRATZ GraphQL client with timeouts/retries
│   ├── proAnalyzer.ts         # Pro match & guide analyzer
│   └── queries.ts             # GraphQL queries
├── gsi/
│   ├── gsiServer.ts           # GSI HTTP server (localhost-only)
│   └── gsiTypes.ts            # TypeScript types for GSI
├── coaching/
│   ├── coachingEngine.ts      # Main coaching engine (role-aware)
│   ├── draftAssistant.ts      # Automatic draft parsing and counter-pick ranking
│   ├── matchTracker.ts        # Match/draft orchestrator
│   ├── heroesData.ts          # Static hero index metadata
│   └── types.ts               # Shared types (Role, HERO_IDS, HERO_ROLES)
├── strategies/                # Hero-specific strategy modules (32)
│   ├── index.ts               # Registry — maps hero ID → strategy
│   ├── voidSpiritStrategy.ts, sniperStrategy.ts, ...
│   └── (+30 more for pos1/3/4/5)
└── voice/voiceOutput.ts       # Offline Piper & OneCore TTS manager (volume-aware)
```

## License

Licensed under the [GNU General Public License v3.0](LICENSE).

Dota 2 hero portraits and related game imagery are property of Valve Corporation and are bundled solely for hero identification in this community project. GankMeDaddy is not affiliated with or endorsed by Valve.
