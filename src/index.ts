// ============================================================================
// GankMeDaddy — Main Entry Point
// Dota 2 Live Mid Coaching Agent for Windows 11
// ============================================================================

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
// Load environment variables FIRST using absolute path relative to index file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const STRATZ_API_TOKEN: string = process.env.STRATZ_API_TOKEN!;
if (!STRATZ_API_TOKEN) {
  console.error('❌ Missing STRATZ_API_TOKEN in environment.');
  console.error('   Please set it in the .env file in the project root.');
  console.error('   Get your token from: https://stratz.com/api → My Tokens');
  process.exit(1);
}

// Never log the actual token
console.log('[INIT] STRATZ_API_TOKEN loaded ✓');

import { ConfigManager } from './config/configManager';
import { StratzClient } from './stratz/stratzClient';
import { ProAnalyzer } from './stratz/proAnalyzer';
import { GSIServer } from './gsi/gsiServer';
import { MatchTracker } from './coaching/matchTracker';
import { CoachingEngine } from './coaching/coachingEngine';
import { VoiceOutput } from './voice/voiceOutput';
import { TrayApp } from './tray/trayApp';
import { HERO_NAMES } from './coaching/types';

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     🎮 GankMeDaddy v1.0                  ║');
  console.log('║     Dota 2 Live Mid Coach                ║');
  console.log('║     Pro Benchmark Mode                   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // -------------------------------------------------------------------------
  // 1. Initialize Config
  // -------------------------------------------------------------------------
  const config = new ConfigManager();
  const cfg = config.get();
  console.log(`[INIT] Steam Account ID: ${cfg.steamAccountId}`);
  console.log(`[INIT] Enabled heroes: ${cfg.enabledHeroIds.map(id => HERO_NAMES[id] || id).join(', ')}`);
  console.log(`[INIT] Aggression level: ${cfg.aggressionLevel}/10`);
  console.log(`[INIT] Voice: ${cfg.voiceEnabled ? 'ON' : 'OFF'}`);
  console.log(`[INIT] Dota 2 path: ${cfg.dota2Path}`);

  const stratz = new StratzClient({ apiToken: STRATZ_API_TOKEN });

  const pro = new ProAnalyzer(stratz);

  (async () => {
    try {
      console.log('[INIT] Loading item constants from STRATZ...');
      await stratz.loadItemConstants();
      console.log('[INIT] Pre-loading pro match data from STRATZ...');
      await pro.preloadAllHeroes(cfg.enabledHeroIds);
    } catch (err) {
      console.error('[INIT] Background STRATZ preloading failed:', err);
    }
  })();

  // -------------------------------------------------------------------------
  // 3. Initialize Voice Output
  // -------------------------------------------------------------------------
  const voice = new VoiceOutput(cfg.voiceEnabled, cfg.voiceRate);

  // -------------------------------------------------------------------------
  // 4. Initialize GSI Server
  // -------------------------------------------------------------------------
  const gsi = new GSIServer({ port: cfg.gsiPort });
  await gsi.start();

  // -------------------------------------------------------------------------
  // 5. Initialize Match Tracker + Coaching Engine
  // -------------------------------------------------------------------------
  const tracker = new MatchTracker(gsi, stratz, pro, config);
  const coach = new CoachingEngine(voice);

  tracker.on('matchStart', (heroId: number) => {
    const context = tracker.getStratzContext();
    const profile = context?.proProfile;
    const isGuideMode = profile?.isGuideMode || false;
    const hasData = !!profile;
    coach.onMatchStart(heroId, isGuideMode, hasData);
  });

  tracker.on('matchEnd', () => {
    coach.onMatchEnd();
  });

  tracker.on('snapshot', (snapshot: any) => {
    coach.processSnapshot(snapshot);
  });



  // -------------------------------------------------------------------------
  // 6. Initialize System Tray
  // -------------------------------------------------------------------------
  const tray = new TrayApp(config, {
    onToggleHero: (heroId: number) => {
      const enabled = config.toggleHero(heroId);
      const heroName = HERO_NAMES[heroId] || `Hero ${heroId}`;
      console.log(`[TRAY] ${heroName}: ${enabled ? 'enabled' : 'disabled'}`);
      if (enabled) {
        pro.analyzeHero(heroId).catch(err =>
          console.error(`Failed to load pro data for ${heroName}:`, err)
        );
      }
    },
    onToggleVoice: () => {
      const newCfg = config.get();
      const newState = !newCfg.voiceEnabled;
      config.update({ voiceEnabled: newState });
      voice.setEnabled(newState);
      console.log(`[TRAY] Voice: ${newState ? 'ON' : 'OFF'}`);
    },
    onSetupGSI: () => {
      setupGSIConfig(config);
    },
    onTestVoice: () => {
      voice.test();
    },
    onQuit: () => {
      console.log('[TRAY] Quitting GankMeDaddy...');
      gsi.stop();
      tray.kill();
      process.exit(0);
    },
  });

  tray.start();

  tracker.on('heroDetected', (heroId: number) => {
    const heroName = HERO_NAMES[heroId] || `Hero ${heroId}`;
    tray.updateStatus(`Hero: ${heroName}`);
    const cfg = config.get();
    if (cfg.enabledHeroIds.includes(heroId)) {
      voice.speakNow(`${heroName} detected. Loading pro data.`);
    } else {
      voice.speakNow(`${heroName} detected. Loading STRATZ guide data.`);
    }
  });

  // -------------------------------------------------------------------------
  // 7. Auto-setup GSI config if not present
  // -------------------------------------------------------------------------
  const gsiConfigPath = config.getGSIConfigPath();
  if (!fs.existsSync(gsiConfigPath)) {
    console.log('[INIT] GSI config not found in Dota 2 directory.');
    setupGSIConfig(config);
  } else {
    console.log('[INIT] GSI config already installed ✓');
  }

  // -------------------------------------------------------------------------
  // Ready!
  // -------------------------------------------------------------------------
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  GankMeDaddy is ready! 🎯');
  console.log('  Start a Dota 2 match to begin coaching.');
  console.log('  Make sure Dota 2 has -gamestateintegration');
  console.log('  in its Steam launch options.');
  console.log('═══════════════════════════════════════════');
  console.log('');

  tray.updateStatus('Ready — waiting for match');
}

/**
 * Copy the GSI config file to Dota 2's cfg directory.
 */
function setupGSIConfig(config: ConfigManager): void {
  const cfg = config.get();
  const destDir = path.join(cfg.dota2Path, 'game', 'dota', 'cfg', 'gamestate_integration');
  const destFile = path.join(destDir, 'gamestate_integration_gankmedaddy.cfg');

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Read the cfg content from our source or generate it
    const cfgContent = `"GankMeDaddy"
{
    "uri"           "http://127.0.0.1:${cfg.gsiPort}/"
    "timeout"       "5.0"
    "buffer"        "0.1"
    "throttle"      "0.1"
    "heartbeat"     "30.0"
    "data"
    {
        "provider"      "1"
        "map"           "1"
        "player"        "1"
        "hero"          "1"
        "abilities"     "1"
        "items"         "1"
        "buildings"     "1"
    }
}
`;

    fs.writeFileSync(destFile, cfgContent, 'utf-8');
    console.log(`[GSI] Config installed to: ${destFile}`);
    console.log('[GSI] Remember to add -gamestateintegration to Dota 2 launch options!');
  } catch (err) {
    console.error('[GSI] Failed to install config:', (err as Error).message);
    console.error(`[GSI] Please manually copy the cfg file to: ${destDir}`);
  }
}

// Run!
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
