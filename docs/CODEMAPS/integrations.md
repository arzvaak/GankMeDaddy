# External Integrations Codemap

**Last Updated:** 2026-07-06
**Entry Points:**
- [src/stratz/stratzClient.ts](file:///d:/GankMeDaddy/src/stratz/stratzClient.ts)
- [src/voice/voiceOutput.ts](file:///d:/GankMeDaddy/src/voice/voiceOutput.ts)

This codemap covers external communication layers: the STRATZ GraphQL client (pro matches), Steam GSI (Dota client link), and the custom Offline TTS player (neural synthesis).

---

## 1. STRATZ API GraphQL Client

GankMeDaddy queries the STRATZ API to compile statistical baselines for Topson's gameplay.

### Architecture
- **GraphQL Client** ([src/stratz/stratzClient.ts](file:///d:/GankMeDaddy/src/stratz/stratzClient.ts)): Runs raw GraphQL queries using standard fetch.
- **Topson Analyzer** ([src/stratz/topsonAnalyzer.ts](file:///d:/GankMeDaddy/src/stratz/topsonAnalyzer.ts)): Iterates through historical match profiles to compute:
  - Median timings for all primary items.
  - Average GPM and XP/Min for the targeted hero.
  - Creep score multipliers.

---

## 2. Steam Game State Integration (GSI)

The Dota 2 client communicates with GankMeDaddy via a local loopback server using standard GSI configuration files.

- **Auto-Installation**: On startup, [`index.ts`](file:///d:/GankMeDaddy/src/index.ts) verifies if `gamestate_integration_gankmedaddy.cfg` exists in the steam directory. If missing, it writes the configuration directly to:
  `[SteamPath]\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\gamestate_integration_gankmedaddy.cfg`
- **Telemetry Buffering**: Ingests player state, game clock, item slots, ability cooldowns, and building structures.

---

## 3. Offline Piper TTS & OneCore Fallback

Voice announcements are processed locally and offline to prevent latency or dependency overheads.

```
                  +--------------------------------+
                  |   VoiceOutput.queue / speak    |
                  +--------------------------------+
                                   |
                       Check if Piper Exists?
                                   |
                      +-------------+-------------+
                      | Yes                       | No
                      v                           v
          +-----------------------+   +-----------------------+
          |     playPiperSpeech   |   |   playFallbackSpeech  |
          +-----------------------+   +-----------------------+
          | 1. Spawn Piper process|   | 1. Write PS1 script   |
          | 2. Generate Temp WAV  |   | 2. Spawn Powershell   |
          | 3. Play WAV Sync      |   | 3. Synthesize & Play  |
          +-----------------------+   +-----------------------+
```

### Safety Features
- **Interrupt Protection**: To stop overlapping audio, the engine terminates running pipelines forcefully using `taskkill /f /t /pid` before spawning new statements.
- **Queue Cooldowns**: Skips stale requests (>15 seconds old) or duplicates with active cooldown timers.

---

## Related Codemaps
- **[Tray UI](file:///d:/GankMeDaddy/docs/CODEMAPS/frontend.md)**
- **[Coaching Engine & API Backend](file:///d:/GankMeDaddy/docs/CODEMAPS/backend.md)**
