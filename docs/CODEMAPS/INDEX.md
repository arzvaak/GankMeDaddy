# GankMeDaddy — Codemaps Index

**Last Updated:** 2026-07-06
**Entry Point:** [src/index.ts](file:///d:/GankMeDaddy/src/index.ts)

GankMeDaddy is a live, data-driven Dota 2 mid lane coaching assistant. It integrates real-time game telemetry, historical professional data, and text-to-speech audio outputs to provide context-aware, voice-coached gameplay tips.

## System Architecture

```
                 +-----------------------------------------+
                 |            Dota 2 Game Client           |
                 +-----------------------------------------+
                                      |
                                      | GSI (JSON POST)
                                      v
                 +-----------------------------------------+
                 |       GSIServer (Port 3001, localhost)  |
                 +-----------------------------------------+
                                      |
                       Telemetry      |
                       Ingestion      v
                 +-----------------------------------------+
                 |        MatchTracker Orchestrator        |
                 +-----------------------------------------+
                                      |
                                      | Snapshot
                                      v
                 +-----------------------------------------+
                 |             CoachingEngine              | <---+
                 +-----------------------------------------+     | Toggles
                               |               ^                 | Settings
                               | Analyze       | Load Topson     |
                               v               |                 |
                         +------------+  +------------+  +---------------+
                         | Strategy   |  |   Stratz   |  |   TrayApp     |
                         | Registry   |  |   Client   |  |  Controller   |
                         +------------+  +------------+  +---------------+
                               |
                               | Voice Prompt
                               v
                         +-----------------------------+
                         |     VoiceOutput Manager     |
                         +-----------------------------+
                            /                       \
                           v                         v
                       +-------+                 +---------+
                       | Piper |                 | OneCore |
                       | (WAV) |                 | Fallback|
                       +-------+                 +---------+
```

## Codemap Directory

To explore specific areas of the GankMeDaddy application, refer to the following codemaps:

1. 📂 **[Tray UI](file:///d:/GankMeDaddy/docs/CODEMAPS/frontend.md)** — Explains the system tray controller.
2. 📂 **[Coaching Engine & API Backend](file:///d:/GankMeDaddy/docs/CODEMAPS/backend.md)** — Documents GSI routing, Match snapshots, the core coaching logic, and hero strategies.
3. 📂 **[External Integrations](file:///d:/GankMeDaddy/docs/CODEMAPS/integrations.md)** — Details connections with Steam GSI, the STRATZ GraphQL client, and the Offline Piper TTS player.
4. 📂 **[Data Config & Persistence](file:///d:/GankMeDaddy/docs/CODEMAPS/database.md)** — Outlines config manager versioning, settings schemas, and directory setup.
