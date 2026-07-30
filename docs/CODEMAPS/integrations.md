# External Integrations Codemap

**Last Updated:** 2026-07-30
**Entry Points:**
- [src/stratz/stratzClient.ts](file:///d:/GankMeDaddy/src/stratz/stratzClient.ts)
- [src/voice/voiceOutput.ts](file:///d:/GankMeDaddy/src/voice/voiceOutput.ts)

This codemap covers external communication layers: the STRATZ GraphQL client (pro matches), Steam GSI (Dota client link), and the custom offline TTS player (neural synthesis with fallback).

---

## 1. STRATZ API GraphQL Client

GankMeDaddy queries the STRATZ API to compile statistical baselines for pro gameplay.

### Architecture
- **GraphQL Client** ([src/stratz/stratzClient.ts](file:///d:/GankMeDaddy/src/stratz/stratzClient.ts)): Runs raw GraphQL queries using standard fetch, dynamically targeting specific professional player accounts.
- **Pro Analyzer** ([src/stratz/proAnalyzer.ts](file:///d:/GankMeDaddy/src/stratz/proAnalyzer.ts)): Iterates through historical match profiles for role-specific representative professional players to compute:
  - Median timings for all primary items.
  - Average GPM and XP/Min for the targeted hero.
  - Creep score multipliers.
  - **Role-Aware Benchmarking**: Uses a targeted mapping of professional players for each role to compile custom benchmarks based on the active role, falling back to STRATZ Pro Guides matches if needed. It caches compiled profiles under `${heroId}_${role}` keys.

---

## 2. Steam Game State Integration (GSI)

The Dota 2 client communicates with GankMeDaddy via a local loopback server using standard GSI configuration files.

The generated configuration subscribes to `draft` in addition to the live match channels. `GSIServer` emits a deduplicated `draftUpdate` whenever picks or bans change; the desktop UI consumes the resulting recommendations automatically. Existing config files are refreshed on coach startup so users do not need to reinstall them after this upgrade.

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
          | 2. Generate Temp WAV  |   | 2. Set $synth.Volume  |
          | 3. SoundPlayer.Play   |   | 3. Synthesize & Play  |
          +-----------------------+   +-----------------------+
```

- **Volume Control**: `VoiceOutput` constructor accepts `enabled`, `rate`, and `volume` (0–100, default 80). Volume is stored in config as `voiceVolume`.
  - **Piper path**: Plays via `System.Media.SoundPlayer.PlaySync()` (no native volume — plays at system level).
  - **OneCore fallback**: Sets `$synth.Volume = ${this.volume}` in the PowerShell script before synthesis.
- **`setVolume(volume)` / `getVolume()`**: Clamp to 0–100 range.

### Safety Features
- **Interrupt Protection**: To stop overlapping audio, the engine terminates running pipelines forcefully using `taskkill /f /t /pid` before spawning new statements.
- **Queue Cooldowns**: Skips stale requests (>15 seconds old) or duplicates with active cooldown timers.

---

## Related Codemaps
- **[Tray UI](file:///d:/GankMeDaddy/docs/CODEMAPS/frontend.md)**
- **[Coaching Engine & API Backend](file:///d:/GankMeDaddy/docs/CODEMAPS/backend.md)**
