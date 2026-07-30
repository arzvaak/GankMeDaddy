# Coaching Engine & API Backend Codemap

**Last Updated:** 2026-07-30
**Entry Points:**
- [src/gsi/gsiServer.ts](file:///d:/GankMeDaddy/src/gsi/gsiServer.ts)
- [src/coaching/coachingEngine.ts](file:///d:/GankMeDaddy/src/coaching/coachingEngine.ts)

This codemap covers GankMeDaddy's backend architecture, detailing endpoints, telemetry ingestion, coaching engines, and hero strategies.

---

## 1. Express GSI Server

The HTTP server listens for Dota 2 Game State Integration telemetry payload posts.

### Endpoints
- `POST /` — Receives JSON payloads from the Dota 2 game client GSI pipeline.
- `GET /health` — Simple health check return code.

---

## 2. Match Ingestion & Snapshots

`MatchTracker` ([src/coaching/matchTracker.ts](file:///d:/GankMeDaddy/src/coaching/matchTracker.ts)) acts as the orchestrator:
- Parses the complex nested GSI payload structures into a normalized `MatchSnapshot` representation.
- Orchestrates loading data-driven STRATZ profiles for pro players.
- Determines role from config (`position` override) or falls back to `HERO_ROLES` auto-detection.
- Emits lifecycle events (`heroDetected`, `matchStart`, `matchEnd`, `snapshot`).

---

## 3. Coaching Engine Logic

`CoachingEngine` evaluates game state snapshots and schedules speech playback. It is **role-aware** — coaching rules adapt to the player's selected position.

```
       +---------------------------------------------+
       |             coachingEngine.ts               |
       +---------------------------------------------+
                              |
                     processSnapshot()
                              |
       +----------------------+----------------------+
       |                      |                      |
       v                      v                      v
 [generalRoleRules()][creepScoreCheckpoints()][proItemTimingAdvice()]
       |                      |                      |
       +----------------------+----------------------+
                              |
                              v
                  [strategy.analyzeSnapshot()]
                              |
                              v
                this.voice.queueRecommendation()
```

### Key Modules
- **General Role Rules** (`generalRoleRules`): Position-aware and lane-specific coaching branch:
  - **Pos 1 (Safelane Carry)**: Protects life, prioritizes farming patterns (jungle/triangle), monitors lane equilibrium, and optimizes items to avoid feed bounty.
  - **Pos 2 (Mid)**: Focuses on Water/Power runes, pushing wave prior to spawn, side-lane active rotations, and fight backline jumps.
  - **Pos 3 (Offlane)**: Denies enemy safelaner healing (lotus), blocks camps, builds frontline aura items, and prioritizes Blink initiations.
  - **Pos 4 (Soft Support)**: Roams to secure mid runes, pressures offlane, and coordinates smoke ganks.
  - **Pos 5 (Hard Support)**: Pulls/stacks (:53-:55), secures lotus pools, prioritizes backline defensive saves, and protects the carry.
  - *All positions*: Lane-aware phase transitions (10m/25m), death feedback, tower defense calls, and low HP/mana alerts.
- **Creep Score Checkpoints**: Compares the player's last hits at 10, 20, and 30 minutes against estimated averages calculated from pro match data. Role-appropriate thresholds (cores get LH comparisons, supports get less strict).
- **Pro Item Timing Advice**: Compares player inventory against median timings of pro-level itemizations.
  - **Dynamic Branching**: Detects player trajectories (Magical or Physical) by scanning for item components (e.g., Kaya vs. Desolator). Once a build path is detected, the engine disables recommendations from the opposing branch to keep timings clean and relevant. Currently active for **mid** and **pos1** roles.
- **Phase/Death Messages**: Tailored by role — cores hear about respawn timers and tp efficiency, supports hear about buyback and ward replenishment.

---

## 4. Strategy Registry & Extensibility

Hero strategies implement `HeroStrategy` ([src/strategies/index.ts](file:///d:/GankMeDaddy/src/strategies/index.ts)) to provide custom advice. There are **32 strategy modules** across all five roles.

### Mid (9)
| Strategy File | Hero ID | Strategy Focus |
|---|---|---|
| [`voidSpiritStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/voidSpiritStrategy.ts) | 126 | Shield trading, level 6 power spikes, and dissimilate dodge reminders. |
| [`sniperStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/sniperStrategy.ts) | 35 | Take Aim positioning, Shrapnel highground zoning, headshot harass. |
| [`shadowFiendStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/shadowFiendStrategy.ts) | 11 | Soul stacking checkpoints, raze double-hit timings, Eul's setups. |
| [`emberSpiritStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/emberSpiritStrategy.ts) | 106 | Remnant safety margins, Sleight of Fist chains combos, Flame Guard farming. |
| [`stormSpiritStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/stormSpiritStrategy.ts) | 17 | Overload attack weaving, Ball Lightning mana emergency limits. |
| [`monkeyKingStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/monkeyKingStrategy.ts) | 114 | Jingu Mastery counts, Tree Dance positioning, primal spring engages. |
| [`queenOfPainStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/queenOfPainStrategy.ts) | 39 | Blink screams, Shadow Strike dagger trades, Sonic Wave burst calculations. |
| [`zeusStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/zeusStrategy.ts) | 22 | Static Field checks, Thundergod's Wrath globally active notifications. |
| [`kezStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/kezStrategy.ts) | 145 | Katana vs Sai stance trade values, Falcon blade rush, Echo sabre timings. |

### Pos 5 — Hard Support (4)
| Strategy File | Hero ID | Strategy Focus |
|---|---|---|
| [`crystalMaidenStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/crystalMaidenStrategy.ts) | 5 | Mana aura uptime, Frostbite creep farming, Freezing Field channel positioning. |
| [`lichStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/lichStrategy.ts) | 31 | Frost Shield priority, Sinister Gaze interrupts, Chain Frost fight timing. |
| [`witchDoctorStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/witchDoctorStrategy.ts) | 30 | Maledict kill pressure, Cask bounce angles, Death Ward ward placement. |
| [`warlockStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/warlockStrategy.ts) | 37 | Fatal Bonds combo, Shadow Word sustain usage, Golem push timing. |

### Pos 4 — Soft Support (5)
| Strategy File | Hero ID | Strategy Focus |
|---|---|---|
| [`rubickStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/rubickStrategy.ts) | 86 | Spell steal priority targets, Telekinesis setup order, Fade Bolt harass. |
| [`lionStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/lionStrategy.ts) | 26 | Mana Drain uptime, Earth Spike multi-stun, Finger of Death burst threshold. |
| [`hoodwinkStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/hoodwinkStrategy.ts) | 123 | Acorn Shot bushwhack combos, Scurry escape planning, Sharpshooter snipes. |
| [`earthSpiritStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/earthSpiritStrategy.ts) | 107 | Rolling Boulder initiations, Magnetize spread management, Stone remnant walls. |
| [`tuskStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/tuskStrategy.ts) | 100 | Snowball save timing, Ice Shards blocking, Walrus Punch burst. |

### Pos 3 — Offlane (7)
| Strategy File | Hero ID | Strategy Focus |
|---|---|---|
| [`axeStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/axeStrategy.ts) | 2 | Berserker's Call blink initiations, helix counter-harass, Culling Blade execution threshold. |
| [`tidehunterStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/tidehunterStrategy.ts) | 29 | Anchor Smash damage reduction, Ravage blink combo, Gush slow tracking. |
| [`sandKingStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/sandKingStrategy.ts) | 16 | Sand Storm safety, Caustic Finale last hits, Epicenter blink channel. |
| [`centaurStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/centaurStrategy.ts) | 96 | Double Edge trading, Stampede engage, Return damage effectiveness. |
| [`marsStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/marsStrategy.ts) | 129 | Spear wall combo angles, Bulwark damage block, Arena of Blood placement. |
| [`dawnbreakerStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/dawnbreakerStrategy.ts) | 135 | Hammer throw trading, Global Presence save timing, Celestial Hammer impact. |
| [`primalBeastStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/primalBeastStrategy.ts) | 137 | Trample uptime, Onslaught charge initiation, Pulverise ult uptime. |

### Pos 1 — Safelane Carry (7)
| Strategy File | Hero ID | Strategy Focus |
|---|---|---|
| [`phantomAssassinStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/phantomAssassinStrategy.ts) | 44 | Dagger crit harass windows, Blur evasion awareness, Coup de Grace threshold. |
| [`facelessVoidStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/facelessVoidStrategy.ts) | 41 | Time Lock bash procs, Time Walk dodge potential, Chronosphere kill confirm. |
| [`spectreStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/spectreStrategy.ts) | 67 | Desolate haunt isolation, Spectral Dagger chase, Reality global pickoff. |
| [`lunaStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/lunaStrategy.ts) | 48 | Lucent Beam harass, Moon Glaive farm pattern, Eclipse burst rotation. |
| [`juggernautStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/juggernautStrategy.ts) | 8 | Blade Fury magic immunity, Healing Ward sustain, Omnislash kill confirm. |
| [`morphlingStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/morphlingStrategy.ts) | 10 | Adaptive Strike combo, Waveform escape, Replicate usage. |
| [`trollWarlordStrategy.ts`](file:///d:/GankMeDaddy/src/strategies/trollWarlordStrategy.ts) | 95 | Fervor stack management, Whirling Axes blind, Battle Trance high ground siege. |

---

## Related Codemaps
- **[Tray UI](file:///d:/GankMeDaddy/docs/CODEMAPS/frontend.md)**
- **[External Integrations](file:///d:/GankMeDaddy/docs/CODEMAPS/integrations.md)**
