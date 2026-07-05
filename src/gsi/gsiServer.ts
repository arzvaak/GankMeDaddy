// ============================================================================
// GankMeDaddy — GSI Server
// HTTP server that receives Dota 2 Game State Integration POST payloads
// ============================================================================

import express from 'express';
import { EventEmitter } from 'events';
import { GameState, GSIMap } from './gsiTypes';
import { DOTA_HEROES } from '../coaching/heroesData';
import { MatchupDraft } from '../coaching/types';
import * as path from 'path';

export interface GSIServerOptions {
  port: number;
}

export class GSIServer extends EventEmitter {
  private app: express.Application;
  private port: number;
  private server: any;
  private lastGameState: string = ''; // track to detect game start/end
  private connected: boolean = false;
  private currentMatchup: MatchupDraft | null = null;

  constructor(options: GSIServerOptions) {
    super();
    this.port = options.port;
    this.app = express();
    this.app.use(express.json({ limit: '1mb' }));
    
    // Serve static files from public directory
    const publicPath = path.join(__dirname, '..', '..', 'public');
    this.app.use(express.static(publicPath));
    
    this.setupRoutes();
  }

  /**
   * Start listening for GSI payloads.
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.log(`[GSI] Server listening on http://0.0.0.0:${this.port}`);
        console.log(`[GSI] Dashboard available at http://localhost:${this.port}/dashboard.html`);
        console.log('[GSI] Waiting for Dota 2 game state data...');
        resolve();
      });
    });
  }

  /**
   * Stop the server.
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      console.log('[GSI] Server stopped');
    }
  }

  /**
   * Whether we've received at least one GSI payload.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the manually selected matchup draft.
   */
  getMatchup(): MatchupDraft | null {
    return this.currentMatchup;
  }

  private setupRoutes(): void {
    // API to get all Dota 2 heroes
    this.app.get('/api/heroes', (_req, res) => {
      res.json(DOTA_HEROES);
    });

    // API to get/set current matchup draft
    this.app.get('/api/matchup', (_req, res) => {
      res.json(this.currentMatchup);
    });

    this.app.post('/api/matchup', (req, res) => {
      const draft: MatchupDraft = req.body;
      if (!draft || !Array.isArray(draft.radiantHeroIds) || !Array.isArray(draft.direHeroIds)) {
        res.status(400).json({ error: 'Invalid draft format' });
        return;
      }
      this.currentMatchup = draft;
      console.log(`[GSI] Matchup synced manually! Player Hero ID: ${draft.myHeroId}`);
      this.emit('matchupUpdated', draft);
      res.json({ status: 'ok', currentMatchup: this.currentMatchup });
    });

    this.app.post('/', (req, res) => {
      const gameState: GameState = req.body;
      res.sendStatus(200);

      if (!this.connected) {
        this.connected = true;
        console.log('[GSI] Connected to Dota 2 client!');
        this.emit('connected');
      }

      // Detect game state transitions
      const currentState = gameState.map?.game_state || '';
      if (currentState !== this.lastGameState) {
        this.handleStateTransition(this.lastGameState, currentState, gameState);
        this.lastGameState = currentState;
      }

      // Emit the full game state for processing
      this.emit('gameStateUpdate', gameState);
    });

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', connected: this.connected });
    });
  }

  private handleStateTransition(from: string, to: string, state: GameState): void {
    console.log(`[GSI] Game state: ${from || 'none'} → ${to}`);

    if (to === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' &&
        from !== 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS') {
      this.emit('matchStart', state);
    }

    if (to === 'DOTA_GAMERULES_STATE_POST_GAME') {
      this.emit('matchEnd', state);
    }

    if (to === 'DOTA_GAMERULES_STATE_HERO_SELECTION') {
      this.emit('heroPicking', state);
    }

    if (to === 'DOTA_GAMERULES_STATE_PRE_GAME') {
      this.emit('preGame', state);
    }
  }
}
