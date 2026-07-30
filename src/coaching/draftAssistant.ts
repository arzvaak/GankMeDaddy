import fetch from 'node-fetch';
import { DOTA_HEROES } from './heroesData';
import { HERO_NAMES, HERO_ROLES, Role } from './types';
import { GameState, GSIDraftTeam } from '../gsi/gsiTypes';

export interface DraftRecommendation {
  heroId: number;
  heroName: string;
  score: number;
  laneScore: number;
  overallScore: number;
  confidence: 'High' | 'Medium' | 'Developing';
  reasons: string[];
}

export interface DraftState {
  active: boolean;
  source: 'gsi' | 'waiting';
  role: Role;
  localTeam: 'radiant' | 'dire' | null;
  allies: number[];
  enemies: number[];
  bans: number[];
  recommendations: DraftRecommendation[];
  updatedAt: number;
  message: string;
}

interface MatchupRow { hero_id: number; games_played: number; wins: number; }

const OPENDOTA = 'https://api.opendota.com/api';

export class DraftAssistant {
  private matchups = new Map<number, Map<number, MatchupRow>>();
  private pending = new Map<number, Promise<void>>();

  warm(candidateIds: number[]): Promise<void> {
    return Promise.all(candidateIds.map(id => {
      if (this.matchups.has(id)) return Promise.resolve();
      const existing = this.pending.get(id);
      if (existing) return existing;
      const request = this.loadMatchup(id).finally(() => this.pending.delete(id));
      this.pending.set(id, request);
      return request;
    })).then(() => undefined);
  }

  async analyze(state: GameState, role: Role, enabledHeroIds: number[]): Promise<DraftState> {
    const radiant = this.extractPicks(state.draft?.team2 || state.draft?.radiant);
    const dire = this.extractPicks(state.draft?.team3 || state.draft?.dire);
    const bans = [
      ...this.extractBans(state.draft?.team2 || state.draft?.radiant),
      ...this.extractBans(state.draft?.team3 || state.draft?.dire),
    ];
    const localTeam = this.localTeam(state);
    const allies = localTeam === 'dire' ? dire : radiant;
    const enemies = localTeam === 'dire' ? radiant : dire;
    const candidates = enabledHeroIds.filter(id => HERO_ROLES[id] === role && !allies.includes(id) && !enemies.includes(id) && !bans.includes(id));

    if (candidates.length) await this.warm(candidates);
    const recommendations = candidates
      .map(id => this.score(id, enemies, allies))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const hasDraft = radiant.length + dire.length + bans.length > 0;

    return {
      active: state.map?.game_state === 'DOTA_GAMERULES_STATE_HERO_SELECTION',
      source: hasDraft ? 'gsi' : 'waiting',
      role,
      localTeam,
      allies,
      enemies,
      bans,
      recommendations,
      updatedAt: Date.now(),
      message: hasDraft
        ? `Live draft detected. Re-ranked for ${this.roleName(role)}.`
        : 'Hero selection detected. Waiting for Dota to publish the first draft pick.',
    };
  }

  private async loadMatchup(id: number): Promise<void> {
    try {
      const response = await fetch(`${OPENDOTA}/heroes/${id}/matchups`, { signal: AbortSignal.timeout(5500) as any });
      if (!response.ok) throw new Error(`${response.status}`);
      const rows = await response.json() as MatchupRow[];
      this.matchups.set(id, new Map(rows.map(row => [row.hero_id, row])));
    } catch {
      this.matchups.set(id, new Map());
    }
  }

  private score(heroId: number, enemies: number[], allies: number[]): DraftRecommendation {
    const rows = this.matchups.get(heroId) || new Map<number, MatchupRow>();
    const samples = enemies.map(enemy => rows.get(enemy)).filter((row): row is MatchupRow => Boolean(row && row.games_played > 0));
    const matchupScores = samples.map(row => 100 * row.wins / row.games_played);
    const overallScore = matchupScores.length ? this.average(matchupScores) : 50;
    const laneScore = matchupScores.length ? Math.max(...matchupScores) : 50;
    const attr = DOTA_HEROES.find(hero => hero.id === heroId)?.attr;
    const allyAttrs = allies.map(id => DOTA_HEROES.find(hero => hero.id === id)?.attr);
    const balanceBonus = attr && allies.length >= 2 && allyAttrs.every(value => value === attr) ? -2 : 1;
    const score = Math.max(1, Math.min(99, Math.round((overallScore * .62 + laneScore * .32 + balanceBonus * 3) * 10) / 10));
    const totalGames = samples.reduce((sum, row) => sum + row.games_played, 0);
    const bestEnemy = samples.sort((a, b) => (b.wins / b.games_played) - (a.wins / a.games_played))[0];
    const reasons: string[] = [];
    if (bestEnemy) reasons.push(`Best measured matchup is into ${HERO_NAMES[bestEnemy.hero_id] || 'a revealed enemy'}.`);
    if (enemies.length > 1) reasons.push(`${overallScore >= 50 ? 'Positive' : 'Playable'} profile across ${enemies.length} revealed opponents.`);
    if (!samples.length) reasons.push('Role-fit recommendation while matchup history finishes loading.');
    if (allies.length) reasons.push(`Keeps the recommendation aligned with ${allies.length} revealed allied ${allies.length === 1 ? 'pick' : 'picks'}.`);
    return {
      heroId,
      heroName: HERO_NAMES[heroId] || `Hero ${heroId}`,
      score,
      laneScore: Math.round(laneScore * 10) / 10,
      overallScore: Math.round(overallScore * 10) / 10,
      confidence: totalGames >= 2500 ? 'High' : totalGames >= 500 ? 'Medium' : 'Developing',
      reasons: reasons.slice(0, 3),
    };
  }

  private extractPicks(team?: GSIDraftTeam): number[] {
    return this.extract(team, /pick\d+_id$/i);
  }

  private extractBans(team?: GSIDraftTeam): number[] {
    return this.extract(team, /ban\d+_id$/i);
  }

  private extract(team: GSIDraftTeam | undefined, pattern: RegExp): number[] {
    if (!team) return [];
    return Object.entries(team)
      .filter(([key, value]) => pattern.test(key) && Number(value) > 0)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, value]) => Number(value));
  }

  private localTeam(state: GameState): 'radiant' | 'dire' | null {
    const team = (state.player?.team_name || '').toLowerCase();
    if (team.includes('radiant') || team === 'team2' || team === '2') return 'radiant';
    if (team.includes('dire') || team === 'team3' || team === '3') return 'dire';
    return null;
  }

  private average(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private roleName(role: Role): string {
    return ({ pos1: 'carry', mid: 'mid', pos3: 'offlane', pos4: 'soft support', pos5: 'hard support' })[role];
  }
}
