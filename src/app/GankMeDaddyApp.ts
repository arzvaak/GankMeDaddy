import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager, AppConfig } from '../config/configManager';
import { StratzClient } from '../stratz/stratzClient';
import { ProAnalyzer } from '../stratz/proAnalyzer';
import { GSIServer } from '../gsi/gsiServer';
import { MatchTracker } from '../coaching/matchTracker';
import { CoachingEngine } from '../coaching/coachingEngine';
import { VoiceOutput } from '../voice/voiceOutput';
import { HERO_NAMES, HERO_ROLES, MatchSnapshot, Role } from '../coaching/types';
import { DraftAssistant, DraftState } from '../coaching/draftAssistant';
import { GameState } from '../gsi/gsiTypes';

export interface RuntimeState {
  running: boolean;
  gsiConnected: boolean;
  inMatch: boolean;
  heroId: number | null;
  heroName: string | null;
  status: string;
  error: string | null;
  startedAt: number | null;
  inDraft: boolean;
}

export class GankMeDaddyApp extends EventEmitter {
  readonly config = new ConfigManager();
  private gsi: GSIServer | null = null;
  private tracker: MatchTracker | null = null;
  private voice: VoiceOutput | null = null;
  private pro: ProAnalyzer | null = null;
  private draft = new DraftAssistant();
  private lastDraftGameState: GameState | null = null;
  private lastDraftSource: 'gsi' | 'vision' = 'vision';
  private lastDraftConfidence: number | undefined;
  private manualEnemySlots: Array<number | null> = Array(5).fill(null);
  private draftRevision = 0;
  private lastSpokenDraftHero: number | null = null;
  private state: RuntimeState = {
    running: false,
    gsiConnected: false,
    inMatch: false,
    heroId: null,
    heroName: null,
    status: 'Setup required',
    error: null,
    startedAt: null,
    inDraft: false,
  };

  constructor(private readonly resourceRoot?: string) {
    super();
  }

  getState(): RuntimeState {
    return { ...this.state };
  }

  getConfig(): AppConfig {
    return this.config.get();
  }

  async start(apiToken: string): Promise<void> {
    if (this.state.running) return;
    if (!apiToken.trim()) {
      this.setState({ status: 'Add your STRATZ token to start', error: null });
      return;
    }

    try {
      const cfg = this.config.get();
      if (fs.existsSync(path.join(cfg.dota2Path, 'game', 'dota'))) {
        // Keep existing installations current without asking the player to
        // revisit setup when new GSI channels are introduced.
        this.setupGSI();
      }
      const stratz = new StratzClient({ apiToken: apiToken.trim() });
      this.pro = new ProAnalyzer(stratz);
      this.voice = new VoiceOutput(cfg.voiceEnabled, cfg.voiceRate, cfg.voiceVolume, this.resourceRoot);
      this.gsi = new GSIServer({ port: cfg.gsiPort });
      await this.gsi.start();

      this.tracker = new MatchTracker(this.gsi, stratz, this.pro, this.config);
      const coach = new CoachingEngine(this.voice);

      this.gsi.on('connected', () => this.setState({ gsiConnected: true, status: 'Dota 2 connected' }));
      this.gsi.on('draftUpdate', (state) => {
        void this.handleDraftUpdate(state);
      });
      this.gsi.on('heroPicking', (state) => {
        this.clearManualEnemyOverrides(false);
        this.setState({ inDraft: true, status: 'Hero selection — reading the draft' });
        void this.handleDraftUpdate(state);
      });
      this.gsi.on('preGame', () => {
        this.clearManualEnemyOverrides(false);
        this.setState({ inDraft: false });
      });
      this.tracker.on('matchStart', (heroId: number) => {
        this.clearManualEnemyOverrides(false);
        const profile = this.tracker?.getStratzContext()?.proProfile;
        coach.onMatchStart(heroId, profile?.isGuideMode || false, !!profile);
        this.setState({ inDraft: false });
        this.setHero(heroId, true, `Live match — ${HERO_NAMES[heroId] || `Hero ${heroId}`}`);
      });
      this.tracker.on('heroDetected', (heroId: number) => {
        this.setHero(heroId, this.state.inMatch, `${HERO_NAMES[heroId] || `Hero ${heroId}`} detected`);
      });
      this.tracker.on('snapshot', (snapshot: MatchSnapshot) => {
        coach.processSnapshot(snapshot);
        this.emit('snapshot', snapshot);
      });
      this.tracker.on('matchEnd', () => {
        coach.onMatchEnd();
        this.lastDraftGameState = null;
        this.lastSpokenDraftHero = null;
        this.clearManualEnemyOverrides(false);
        this.setState({ inMatch: false, heroId: null, heroName: null, status: 'Match complete — waiting for Dota 2' });
      });

      this.setState({
        running: true,
        status: 'Ready — waiting for Dota 2',
        error: null,
        startedAt: Date.now(),
      });

      void this.draft.warm(cfg.enabledHeroIds.filter(id => HERO_ROLES[id] === cfg.position));

      void (async () => {
        try {
          this.emit('activity', 'Loading STRATZ item data and professional benchmarks…');
          await stratz.loadItemConstants();
          await this.pro?.preloadAllHeroes(cfg.enabledHeroIds);
          this.emit('activity', 'Professional benchmarks are ready.');
        } catch (error) {
          this.emit('activity', `STRATZ preload warning: ${(error as Error).message}`);
        }
      })();
    } catch (error) {
      const message = (error as Error).message;
      this.gsi?.stop();
      this.gsi = null;
      this.tracker = null;
      this.voice = null;
      this.setState({ running: false, status: 'Could not start', error: message, startedAt: null });
      throw error;
    }
  }

  stop(): void {
    this.gsi?.stop();
    this.gsi = null;
    this.tracker = null;
    this.voice?.setEnabled(false);
    this.voice = null;
    this.pro = null;
    this.lastDraftGameState = null;
    this.lastSpokenDraftHero = null;
    this.clearManualEnemyOverrides(false);
    this.setState({
      running: false,
      gsiConnected: false,
      inMatch: false,
      heroId: null,
      heroName: null,
      status: 'Coach stopped',
      error: null,
      startedAt: null,
      inDraft: false,
    });
  }

  updateConfig(partial: Partial<AppConfig>): AppConfig {
    this.config.update(partial);
    const cfg = this.config.get();
    if (partial.voiceEnabled !== undefined) this.voice?.setEnabled(cfg.voiceEnabled);
    if (partial.voiceVolume !== undefined) this.voice?.setVolume(cfg.voiceVolume);
    if (partial.voiceRate !== undefined) this.voice?.setRate(cfg.voiceRate);
    return cfg;
  }

  setPosition(role: Role): AppConfig {
    const cfg = this.updateConfig({ position: role });
    this.voice?.speakNow(`Position set to ${role === 'mid' ? 'mid' : role}.`);
    if (this.lastDraftGameState) void this.handleDraftUpdate(this.lastDraftGameState);
    return cfg;
  }

  toggleHero(heroId: number): AppConfig {
    const enabled = this.config.toggleHero(heroId);
    if (enabled) void this.pro?.analyzeHero(heroId).catch(() => undefined);
    if (this.lastDraftGameState) void this.handleDraftUpdate(this.lastDraftGameState);
    return this.config.get();
  }

  testVoice(): void {
    this.voice?.test();
  }

  setupGSI(): string {
    const cfg = this.config.get();
    const destDir = path.join(cfg.dota2Path, 'game', 'dota', 'cfg', 'gamestate_integration');
    const destFile = path.join(destDir, 'gamestate_integration_gankmedaddy.cfg');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destFile, `"GankMeDaddy"\n{\n  "uri" "http://127.0.0.1:${cfg.gsiPort}/"\n  "timeout" "5.0"\n  "buffer" "0.1"\n  "throttle" "0.1"\n  "heartbeat" "30.0"\n  "data"\n  {\n    "provider" "1"\n    "map" "1"\n    "player" "1"\n    "hero" "1"\n    "abilities" "1"\n    "items" "1"\n    "buildings" "1"\n    "draft" "1"\n  }\n}\n`, 'utf8');
    this.emit('activity', `GSI configuration installed to ${destFile}`);
    return destFile;
  }

  processVisualDraft(radiant: number[], dire: number[], confidence: number): void {
    if (!this.state.running) return;
    const base = this.lastDraftGameState || {};
    const team = (ids: number[]) => Object.fromEntries(ids.map((id, index) => [`pick${index}_id`, id]));
    const state: GameState = {
      ...base,
      draft: { team2: team(radiant), team3: team(dire) },
    };
    if (!this.state.inDraft) this.setState({ inDraft: true, status: 'Hero selection — reading the Dota window' });
    void this.handleDraftUpdate(state, 'vision', confidence);
  }

  async setEnemyOverride(slot: number, heroId: number | null): Promise<DraftState> {
    if (!Number.isInteger(slot) || slot < 0 || slot > 4) throw new Error('Enemy slot must be between 1 and 5.');
    if (heroId !== null && !HERO_NAMES[heroId]) throw new Error('Unknown hero.');
    if (heroId !== null) this.manualEnemySlots = this.manualEnemySlots.map(id => id === heroId ? null : id);
    this.manualEnemySlots[slot] = heroId;
    const state: GameState = this.lastDraftGameState || ({
      map: { game_state: 'DOTA_GAMERULES_STATE_HERO_SELECTION' },
      draft: { team2: {}, team3: {} },
    } as GameState);
    return this.handleDraftUpdate(state, this.lastDraftSource, this.lastDraftConfidence);
  }

  async clearManualEnemyOverrides(reanalyze = true): Promise<DraftState | null> {
    this.manualEnemySlots = Array(5).fill(null);
    this.draftRevision++;
    if (!reanalyze || !this.lastDraftGameState) return null;
    return this.handleDraftUpdate(this.lastDraftGameState, this.lastDraftSource, this.lastDraftConfidence);
  }

  private async handleDraftUpdate(state: GameState, source: 'gsi' | 'vision' = 'gsi', confidence?: number): Promise<DraftState> {
    const revision = ++this.draftRevision;
    this.lastDraftGameState = state;
    this.lastDraftSource = source;
    this.lastDraftConfidence = confidence;
    const cfg = this.config.get();
    const result: DraftState = await this.draft.analyze(state, cfg.position, cfg.enabledHeroIds, source, [...this.manualEnemySlots]);
    if (revision !== this.draftRevision) return result;
    this.emit('draft', confidence === undefined ? result : { ...result, visionConfidence: confidence });
    if (result.source === 'gsi' || result.source === 'vision') {
      this.setState({ status: 'Live draft — recommendations updating' });
      const best = result.recommendations[0];
      if (best && best.heroId !== this.lastSpokenDraftHero) {
        this.lastSpokenDraftHero = best.heroId;
        const voiceRole: Record<Role, string> = { pos1: 'carry', mid: 'mid', pos3: 'offlane', pos4: 'soft support', pos5: 'hard support' };
        this.voice?.speakNow(`Best ${voiceRole[cfg.position]} pick: ${best.heroName}. ${best.reasons[0] || ''}`);
      }
    }
    return result;
  }

  private setHero(heroId: number, inMatch: boolean, status: string): void {
    this.setState({ heroId, heroName: HERO_NAMES[heroId] || `Hero ${heroId}`, inMatch, status });
  }

  private setState(partial: Partial<RuntimeState>): void {
    this.state = { ...this.state, ...partial };
    this.emit('state', this.getState());
  }
}
