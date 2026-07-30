// ============================================================================
// GankMeDaddy — GSI Server
// HTTP server that receives Dota 2 Game State Integration POST payloads
// ============================================================================

import express from 'express';
import { EventEmitter } from 'events';
import { Server as HttpServer } from 'http';
import { GameState } from './gsiTypes';

export interface GSIServerOptions {
  port: number;
}

export class GSIServer extends EventEmitter {
  private app: express.Application;
  private port: number;
  private server: HttpServer | null = null;
  private lastGameState: string = ''; // track to detect game start/end
  private connected: boolean = false;

  constructor(options: GSIServerOptions) {
    super();
    this.port = options.port;
    this.app = express();
    this.app.use(express.json({ limit: '1mb' }));
    
    this.setupRoutes();
  }

  /**
   * Start listening for GSI payloads.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, '127.0.0.1', () => {
        server.removeListener('error', onError);
        console.log(`[GSI] Server listening on http://127.0.0.1:${this.port} (localhost only)`);
        console.log('[GSI] Waiting for Dota 2 game state data...');
        resolve();
      });
      const onError = (error: Error) => {
        this.server = null;
        reject(error);
      };
      server.once('error', onError);
      this.server = server;
    });
  }

  /**
   * Stop the server.
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.connected = false;
      this.lastGameState = '';
      console.log('[GSI] Server stopped');
    }
  }

  /**
   * Whether we've received at least one GSI payload.
   */
  isConnected(): boolean {
    return this.connected;
  }

  private setupRoutes(): void {
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
