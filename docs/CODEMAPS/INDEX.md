# GankMeDaddy — Codemaps Index

**Last Updated:** 2026-07-30
**Entry Point:** `src/electron/main.ts`

GankMeDaddy is a live, data-driven Dota 2 coaching assistant supporting all five positions (pos1, mid, pos3, pos4, pos5). It integrates real-time game telemetry, historical professional data, and text-to-speech audio outputs to provide context-aware, voice-coached gameplay tips.

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
                                      | Snapshot + Role
                                      v
                 +-----------------------------------------+
                 |             CoachingEngine              | <---+
                 +-----------------------------------------+     | Position
                               |               ^                 | Volume
                               | Analyze       | Load Pro Data   | Settings
                               v               |                 |
                         +------------+  +------------+  +---------------+
                         | Strategy   |  |   Stratz   |  | Electron UI   |
                         | Registry   |  |   Client   |  | + Native Tray |
                         +------------+  +------------+  +---------------+
                               |
                               | Voice Prompt
                               v
                         +-----------------------------+
                         |     VoiceOutput Manager     |
                         |   (volume-aware queue)      |
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

1. **[Desktop UI](frontend.md)** — Explains the Electron dashboard, secure preload bridge, system tray, and packaging boundary.
2. **[Coaching Engine & API Backend](backend.md)** — Documents GSI routing, match snapshots, the core coaching logic, role-aware rules, and hero strategies.
3. **[External Integrations](integrations.md)** — Details connections with Steam GSI, the STRATZ GraphQL client, and the offline Piper TTS player with volume support.
4. **[Data Config & Persistence](database.md)** — Outlines config manager versioning, settings schemas, and directory setup.
