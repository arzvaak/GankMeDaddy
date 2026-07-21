// ============================================================================
// GankMeDaddy — Configuration Manager
// Persists user settings in %APPDATA%/GankMeDaddy/config.json
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HERO_IDS } from '../coaching/types';

const APP_NAME = 'GankMeDaddy';
const CONFIG_DIR = path.join(
  process.env.APPDATA || path.join(process.env.HOME || '.', 'AppData', 'Roaming'),
  APP_NAME
);
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface AppConfig {
  /** Config schema version for migration */
  configVersion?: number;
  /** User's Steam account ID */
  steamAccountId: number;
  /** Hero IDs that are enabled for coaching */
  enabledHeroIds: number[];
  /** Aggression level 1-10 (10 = most aggressive) */
  aggressionLevel: number;
  /** Whether voice coaching is enabled */
  voiceEnabled: boolean;
  /** TTS speech rate (0.5 to 2.0) */
  voiceRate: number;
  /** Dota 2 installation path */
  dota2Path: string;
  /** GSI server port */
  gsiPort: number;
  /** How often to poll STRATZ for pre-game data (seconds) */
  stratzPollInterval: number;
}

const DEFAULT_CONFIG: AppConfig = {
  configVersion: 2,
  steamAccountId: 82744607,
  enabledHeroIds: [...SUPPORTED_HERO_IDS],
  aggressionLevel: 10,
  voiceEnabled: true,
  voiceRate: 1.0,
  dota2Path: 'D:\\Programs\\Steam\\steamapps\\common\\dota 2 beta',
  gsiPort: 3001,
  stratzPollInterval: 10,
};

export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.load();
  }

  /**
   * Get the current config.
   */
  get(): AppConfig {
    return { ...this.config };
  }

  /**
   * Update config with partial values and save.
   */
  update(partial: Partial<AppConfig>): void {
    this.config = { ...this.config, ...partial };
    this.save();
  }

  /**
   * Toggle a hero on/off.
   */
  toggleHero(heroId: number): boolean {
    const idx = this.config.enabledHeroIds.indexOf(heroId);
    if (idx >= 0) {
      this.config.enabledHeroIds.splice(idx, 1);
      this.save();
      return false; // now disabled
    } else {
      this.config.enabledHeroIds.push(heroId);
      this.save();
      return true; // now enabled
    }
  }

  /**
   * Check if a hero is enabled.
   */
  isHeroEnabled(heroId: number): boolean {
    return this.config.enabledHeroIds.includes(heroId);
  }

  /**
   * Get the GSI config file path in Dota 2 directory.
   */
  getGSIConfigPath(): string {
    return path.join(
      this.config.dota2Path,
      'game', 'dota', 'cfg', 'gamestate_integration',
      'gamestate_integration_gankmedaddy.cfg'
    );
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private load(): AppConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Merge with defaults to handle new fields added in updates
        const loaded = { ...DEFAULT_CONFIG, ...parsed };
        
        // Handle migration from older config versions lacking Kez (ID 145)
        if (!parsed.configVersion || parsed.configVersion < 2) {
          if (!loaded.enabledHeroIds.includes(145)) {
            loaded.enabledHeroIds.push(145);
          }
          loaded.configVersion = 2;
          this.config = loaded;
          this.save();
        }
        return loaded;
      }
    } catch (err) {
      console.warn('[CONFIG] Failed to load config, using defaults:', (err as Error).message);
    }

    // First run — create config directory and save defaults
    this.config = { ...DEFAULT_CONFIG };
    this.save();
    return this.config;
  }

  private save(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[CONFIG] Failed to save config:', (err as Error).message);
    }
  }
}
