# Coaching Engine & API Backend Codemap

**Last Updated:** 2026-07-05
**Entry Points:**
- [src/gsi/gsiServer.ts](file:///d:/GankMeDaddy/src/gsi/gsiServer.ts)
- [src/coaching/coachingEngine.ts](file:///d:/GankMeDaddy/src/coaching/coachingEngine.ts)

This codemap covers GankMeDaddy's backend architecture, detailing endpoints, telemetry ingestion, coaching engines, and hero strategies.

---

## 1. Express API and GSI Server

The HTTP server serves dashboard assets, handles matchup syncing, and listens for Dota 2 Game State Integration telemetry payload posts.

### Endpoints
- `POST /` — Receives JSON payloads from the Dota 2 game client GSI pipeline.
- `GET /health` — Simple health check return code.
- `GET /api/heroes` — Returns the sorted list of supported mid lane heroes.
- `GET /api/matchup` — Retrieves the active draft (Radiant/Dire team lineups and designated hero).
- `POST /api/matchup` — Receives and updates manual draft selections from the dashboard.

---

## 2. Match Ingestion & Snapshots

`MatchTracker` ([src/coaching/matchTracker.ts](file:///d:/GankMeDaddy/src/coaching/matchTracker.ts)) acts as the orchestrator:
- Parses the complex nested GSI payload structures into a normalized `MatchSnapshot` representation.
- Orchestrates loading data-driven STRATZ profiles for Topson.
- Emits lifecycle events (`heroDetected`, `matchStart`, `matchEnd`, `snapshot`).

---

## 3. Coaching Engine Logic

`CoachingEngine` evaluates game state snapshots and schedules speech playback.

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
[generalMidRules()]  [creepScoreCheckpoints()][topsonItemTimingAdvice()]
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
- **General Mid Rules**: Evaluates water/power rune timings, low HP/mana alerts, tower thresholds, and laning phase endings.
- **Creep Score Checkpoints**: Compares the player's last hits at 10, 20, and 30 minutes against estimated averages calculated from Topson's match data.
- **Topson Item Timing Advice**: Compares player inventory against median timings of pro-level itemizations.
  - **Dynamic Branching**: Detects player trajectories (Magical or Physical) by scanning for item components (e.g., Kaya vs. Desolator). Once a build path is detected, the engine disables recommendations from the opposing branch to keep timings clean and relevant.

---

## 4. Strategy Registry & Extensibility

Hero strategies implement `HeroStrategy` ([src/strategies/index.ts](file:///d:/GankMeDaddy/src/strategies/index.ts)) to provide custom advice.

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

---

## Related Codemaps
- **[Web Dashboard & Tray UI](file:///d:/GankMeDaddy/docs/CODEMAPS/frontend.md)**
- **[External Integrations](file:///d:/GankMeDaddy/docs/CODEMAPS/integrations.md)**
