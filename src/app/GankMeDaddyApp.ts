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
import { HERO_NAMES, MatchSnapshot, Role } from '../coaching/types';

export interface RuntimeState {
  running: boolean;
  gsiConnected: boolean;
  inMatch: boolean;
  heroId: number | null;
  heroName: string | null;
  status: string;
  error: string | null;
  startedAt: number | null;
}

export class GankMeDaddyApp extends EventEmitter {
  readonly config = new ConfigManager();
  private gsi: GSIServer | null = null;
  private tracker: MatchTracker | null = null;
  private voice: VoiceOutput | null = null;
  private pro: ProAnalyzer | null = null;
  private state: RuntimeState = {
    running: false,
    gsiConnected: false,
    inMatch: false,
    heroId: null,
    heroName: null,
    status: 'Setup required',
    error: null,
    startedAt: null,
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
      const stratz = new StratzClient({ apiToken: apiToken.trim() });
      this.pro = new ProAnalyzer(stratz);
      this.voice = new VoiceOutput(cfg.voiceEnabled, cfg.voiceRate, cfg.voiceVolume, this.resourceRoot);
      this.gsi = new GSIServer({ port: cfg.gsiPort });
      await this.gsi.start();

      this.tracker = new MatchTracker(this.gsi, stratz, this.pro, this.config);
      const coach = new CoachingEngine(this.voice);

      this.gsi.on('connected', () => this.setState({ gsiConnected: true, status: 'Dota 2 connected' }));
      this.tracker.on('matchStart', (heroId: number) => {
        const profile = this.tracker?.getStratzContext()?.proProfile;
        coach.onMatchStart(heroId, profile?.isGuideMode || false, !!profile);
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
        this.setState({ inMatch: false, heroId: null, heroName: null, status: 'Match complete — waiting for Dota 2' });
      });

      this.setState({
        running: true,
        status: 'Ready — waiting for Dota 2',
        error: null,
        startedAt: Date.now(),
      });

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
    this.setState({
      running: false,
      gsiConnected: false,
      inMatch: false,
      heroId: null,
      heroName: null,
      status: 'Coach stopped',
      error: null,
      startedAt: null,
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
    return cfg;
  }

  toggleHero(heroId: number): AppConfig {
    const enabled = this.config.toggleHero(heroId);
    if (enabled) void this.pro?.analyzeHero(heroId).catch(() => undefined);
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
    fs.writeFileSync(destFile, `"GankMeDaddy"\n{\n  "uri" "http://127.0.0.1:${cfg.gsiPort}/"\n  "timeout" "5.0"\n  "buffer" "0.1"\n  "throttle" "0.1"\n  "heartbeat" "30.0"\n  "data"\n  {\n    "provider" "1"\n    "map" "1"\n    "player" "1"\n    "hero" "1"\n    "abilities" "1"\n    "items" "1"\n    "buildings" "1"\n  }\n}\n`, 'utf8');
    this.emit('activity', `GSI configuration installed to ${destFile}`);
    return destFile;
  }

  private setHero(heroId: number, inMatch: boolean, status: string): void {
    this.setState({ heroId, heroName: HERO_NAMES[heroId] || `Hero ${heroId}`, inMatch, status });
  }

  private setState(partial: Partial<RuntimeState>): void {
    this.state = { ...this.state, ...partial };
    this.emit('state', this.getState());
  }
}
