// ============================================================================
// GankMeDaddy — Match Tracker
// Orchestrates GSI data + STRATZ context into MatchSnapshots
// ============================================================================

import { EventEmitter } from 'events';
import { GameState } from '../gsi/gsiTypes';
import { GSIServer } from '../gsi/gsiServer';
import { StratzClient } from '../stratz/stratzClient';
import { TopsonAnalyzer } from '../stratz/topsonAnalyzer';
import { ConfigManager } from '../config/configManager';
import {
  MatchSnapshot,
  GamePhase,
  PlayerSnapshot,
  HeroSnapshot,
  ItemSlot,
  AbilitySlot,
  BuildingSnapshot,
  StratzContext,
  SUPPORTED_HERO_IDS,
} from './types';

export class MatchTracker extends EventEmitter {
  private gsi: GSIServer;
  private stratz: StratzClient;
  private topson: TopsonAnalyzer;
  private config: ConfigManager;

  private inMatch: boolean = false;
  private currentHeroId: number = 0;
  private stratzContext: StratzContext | null = null;
  private lastSnapshot: MatchSnapshot | null = null;

  constructor(
    gsi: GSIServer,
    stratz: StratzClient,
    topson: TopsonAnalyzer,
    config: ConfigManager
  ) {
    super();
    this.gsi = gsi;
    this.stratz = stratz;
    this.topson = topson;
    this.config = config;

    this.setupListeners();
  }

  /**
   * Get the last snapshot (for UI display).
   */
  getLastSnapshot(): MatchSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Whether currently tracking a match.
   */
  isInMatch(): boolean {
    return this.inMatch;
  }

  /**
   * Currently detected hero ID.
   */
  getCurrentHeroId(): number {
    return this.currentHeroId;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private setupListeners(): void {
    this.gsi.on('matchStart', async (state: GameState) => {
      console.log('[TRACKER] Match started!');
      this.inMatch = true;
      this.currentHeroId = state.hero?.id || 0;

      // Fetch STRATZ context for the detected hero
      await this.loadStratzContext(this.currentHeroId);

      this.emit('matchStart', this.currentHeroId);
    });

    this.gsi.on('preGame', async (state: GameState) => {
      // Hero might be picked during pre-game
      if (state.hero?.id && state.hero.id !== this.currentHeroId) {
        this.currentHeroId = state.hero.id;
        console.log(`[TRACKER] Hero detected: ${state.hero.name} (ID: ${this.currentHeroId})`);
        await this.loadStratzContext(this.currentHeroId);
        this.emit('heroDetected', this.currentHeroId);
      }
    });

    this.gsi.on('matchEnd', (_state: GameState) => {
      console.log('[TRACKER] Match ended.');
      this.inMatch = false;
      this.currentHeroId = 0;
      this.stratzContext = null;
      this.lastSnapshot = null;
      this.emit('matchEnd');
    });

    this.gsi.on('gameStateUpdate', (state: GameState) => {
      if (!state.map || state.map.game_state !== 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS') {
        return;
      }

      // Detect hero if not yet known
      if (!this.currentHeroId && state.hero?.id) {
        this.currentHeroId = state.hero.id;
        this.loadStratzContext(this.currentHeroId);
      }

      // Build snapshot
      const snapshot = this.buildSnapshot(state);
      if (snapshot) {
        this.lastSnapshot = snapshot;
        this.emit('snapshot', snapshot);
      }
    });
  }

  private async loadStratzContext(heroId: number): Promise<void> {
    if (!heroId || !SUPPORTED_HERO_IDS.includes(heroId)) {
      this.stratzContext = {
        topsonProfile: null,
        userRecentMatches: 0,
        userWinRate: null,
      };
      return;
    }

    console.log(`[TRACKER] Loading STRATZ context for hero ${heroId}...`);

    // Get Topson's profile (may already be cached from preload)
    const topsonProfile = await this.topson.analyzeHero(heroId);

    // Fetch user's own recent matches on this hero
    let userRecentMatches = 0;
    let userWinRate: number | null = null;
    try {
      const userConfig = this.config.get();
      const userMatches = await this.stratz.fetchPlayerMatches(
        userConfig.steamAccountId,
        [heroId],
        10
      );
      if (Array.isArray(userMatches) && userMatches.length > 0) {
        userRecentMatches = userMatches.length;
        const wins = userMatches.filter((m: any) =>
          m.players?.some((p: any) =>
            p.steamAccountId === userConfig.steamAccountId && p.isVictory
          )
        ).length;
        userWinRate = wins / userMatches.length;
      }
    } catch (err) {
      console.warn('[TRACKER] Failed to fetch user matches:', (err as Error).message);
    }

    this.stratzContext = {
      topsonProfile,
      userRecentMatches,
      userWinRate,
    };

    console.log(`[TRACKER] STRATZ context loaded. Topson data: ${topsonProfile ? 'yes' : 'no'}, User matches: ${userRecentMatches}`);
  }

  private buildSnapshot(state: GameState): MatchSnapshot | null {
    if (!state.map || !state.player || !state.hero) return null;

    const gameTime = state.map.game_time;
    const clockTime = state.map.clock_time;

    // Determine game phase
    let phase: GamePhase = 'laning';
    if (clockTime > 1500) phase = 'lategame';     // 25 min
    else if (clockTime > 600) phase = 'midgame';   // 10 min

    // Build player snapshot
    const player: PlayerSnapshot = {
      gold: state.player.gold || 0,
      goldReliable: state.player.gold_reliable || 0,
      goldUnreliable: state.player.gold_unreliable || 0,
      kills: state.player.kills || 0,
      deaths: state.player.deaths || 0,
      assists: state.player.assists || 0,
      lastHits: state.player.last_hits || 0,
      denies: state.player.denies || 0,
      gpm: state.player.gpm || 0,
      xpm: state.player.xpm || 0,
    };

    // Build hero snapshot
    const hero: HeroSnapshot = {
      heroId: state.hero.id || this.currentHeroId,
      level: state.hero.level || 1,
      xpos: state.hero.xpos || 0,
      ypos: state.hero.ypos || 0,
      health: state.hero.health || 0,
      maxHealth: state.hero.max_health || 1,
      healthPercent: state.hero.health_percent || 0,
      mana: state.hero.mana || 0,
      maxMana: state.hero.max_mana || 1,
      manaPercent: state.hero.mana_percent || 0,
      alive: state.hero.alive !== false,
      respawnSeconds: state.hero.respawn_seconds || 0,
    };

    // Build items snapshot
    const items: ItemSlot[] = [];
    if (state.items) {
      for (let i = 0; i < 6; i++) {
        const slot = (state.items as any)[`slot${i}`];
        if (slot && slot.name && slot.name !== 'empty') {
          items.push({
            slotIndex: i,
            itemName: slot.name.replace('item_', ''),
            itemId: 0, // GSI doesn't give numeric IDs directly
            charges: slot.charges || 0,
            cooldown: slot.cooldown || 0,
            passive: slot.passive || false,
          });
        }
      }
      // Also check neutral slot
      const neutral = (state.items as any)['neutral0'];
      if (neutral && neutral.name && neutral.name !== 'empty') {
        items.push({
          slotIndex: 9,
          itemName: neutral.name.replace('item_', ''),
          itemId: 0,
          charges: neutral.charges || 0,
          cooldown: neutral.cooldown || 0,
          passive: neutral.passive || false,
        });
      }
    }

    // Build abilities snapshot
    const abilities: AbilitySlot[] = [];
    if (state.abilities) {
      for (const [_key, ability] of Object.entries(state.abilities)) {
        if (ability && typeof ability === 'object' && 'name' in ability) {
          abilities.push({
            abilityName: (ability as any).name || '',
            level: (ability as any).level || 0,
            canCast: (ability as any).can_cast || false,
            passive: (ability as any).passive || false,
            cooldown: (ability as any).cooldown || 0,
            ultimate: (ability as any).ultimate || false,
          });
        }
      }
    }

    // Build buildings snapshot
    const buildings: BuildingSnapshot[] = [];
    if (state.buildings) {
      for (const team of ['radiant', 'dire'] as const) {
        const teamBuildings = state.buildings[team];
        if (teamBuildings) {
          for (const [name, building] of Object.entries(teamBuildings)) {
            buildings.push({
              name,
              health: building.health,
              maxHealth: building.max_health,
              team,
            });
          }
        }
      }
    }

    return {
      gameTime,
      clockTime,
      isDaytime: state.map.daytime,
      phase,
      player,
      hero,
      items,
      abilities,
      buildings,
      stratzContext: (this.stratzContext && this.stratzContext.topsonProfile?.heroId === hero.heroId)
        ? this.stratzContext
        : {
            topsonProfile: null,
            userRecentMatches: 0,
            userWinRate: null,
          },
    };
  }
}
