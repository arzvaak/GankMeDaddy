// ============================================================================
// GankMeDaddy — System Tray Application
// Lightweight system tray UI with hero selection and status display
// ============================================================================

import SysTray from 'systray2';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigManager } from '../config/configManager';
import { HERO_NAMES, SUPPORTED_HERO_IDS } from '../coaching/types';

// Base64 encoded minimal 16x16 ICO (red/orange dot icon)
const TRAY_ICON_B64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABMLAAATCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A/2oA//9qAP//agD/////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD///8A////AP///wD///8A////AP9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD/////AP///wD///8A////AP///wD///8A/2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA/////wD///8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD///8A/2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA/////wD///8A////AP///wD///8A////AP9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD/////AP///wD///8A////AP///wD///8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP9qAP//agD//2oA/////wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

export interface TrayCallbacks {
  onToggleHero: (heroId: number) => void;
  onToggleVoice: () => void;
  onSetupGSI: () => void;
  onTestVoice: () => void;
  onQuit: () => void;
}

export class TrayApp {
  private config: ConfigManager;
  private systray: SysTray | null = null;
  private callbacks: TrayCallbacks;
  private statusText: string = 'Waiting for Dota 2...';

  constructor(config: ConfigManager, callbacks: TrayCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Start the system tray application.
   */
  start(): void {
    const cfg = this.config.get();

    const heroMenuItems = SUPPORTED_HERO_IDS.map((heroId, idx) => ({
      title: `${cfg.enabledHeroIds.includes(heroId) ? '☑' : '☐'} ${HERO_NAMES[heroId]}`,
      tooltip: `Toggle ${HERO_NAMES[heroId]}`,
      checked: cfg.enabledHeroIds.includes(heroId),
      enabled: true,
    }));

    const menuItems = [
      { title: `Status: ${this.statusText}`, tooltip: 'Current status', enabled: false, checked: false },
      { title: '─────────────', tooltip: '', enabled: false, checked: false },
      ...heroMenuItems,
      { title: '─────────────', tooltip: '', enabled: false, checked: false },
      { title: `Voice: ${cfg.voiceEnabled ? 'ON' : 'OFF'}`, tooltip: 'Toggle voice', enabled: true, checked: false },
      { title: `Aggression: ${cfg.aggressionLevel}/10`, tooltip: 'Aggression level', enabled: false, checked: false },
      { title: '─────────────', tooltip: '', enabled: false, checked: false },
      { title: 'Setup GSI Config', tooltip: 'Copy GSI config to Dota 2', enabled: true, checked: false },
      { title: 'Test Voice', tooltip: 'Test TTS output', enabled: true, checked: false },
      { title: '─────────────', tooltip: '', enabled: false, checked: false },
      { title: 'Quit', tooltip: 'Exit GankMeDaddy', enabled: true, checked: false },
    ];

    let trayIcon = TRAY_ICON_B64;
    const iconPath = 'D:\\GankMeDaddy\\dota2.ico';
    if (fs.existsSync(iconPath)) {
      try {
        trayIcon = fs.readFileSync(iconPath).toString('base64');
      } catch (e) {
        console.error('Failed to read dota2.ico:', e);
      }
    }

    this.systray = new SysTray({
      menu: {
        icon: trayIcon,
        title: 'GankMeDaddy',
        tooltip: 'GankMeDaddy — Dota 2 Mid Coach',
        items: menuItems,
      },
      debug: false,
      copyDir: true,
    });

    this.systray.onClick(action => {
      const idx = action.seq_id;
      const heroCount = SUPPORTED_HERO_IDS.length;

      // Menu layout:
      // 0: status (disabled)
      // 1: separator
      // 2 to 2+heroCount-1: hero toggles
      // 2+heroCount: separator
      // 2+heroCount+1: voice toggle
      // 2+heroCount+2: aggression display
      // 2+heroCount+3: separator
      // 2+heroCount+4: setup GSI
      // 2+heroCount+5: test voice
      // 2+heroCount+6: separator
      // 2+heroCount+7: quit

      const heroStart = 2;
      const heroEnd = heroStart + heroCount - 1;

      if (idx >= heroStart && idx <= heroEnd) {
        const heroId = SUPPORTED_HERO_IDS[idx - heroStart];
        this.callbacks.onToggleHero(heroId);
      } else if (idx === heroEnd + 2) {
        this.callbacks.onToggleVoice();
      } else if (idx === heroEnd + 5) {
        this.callbacks.onSetupGSI();
      } else if (idx === heroEnd + 6) {
        this.callbacks.onTestVoice();
      } else if (idx === heroEnd + 8) {
        this.callbacks.onQuit();
      }
    });

    console.log('[TRAY] System tray started');
  }

  /**
   * Update the status text shown in the tray menu.
   */
  updateStatus(status: string): void {
    this.statusText = status;
    // systray2 doesn't support dynamic menu updates easily,
    // so we log the status to console instead
    console.log(`[STATUS] ${status}`);
  }

  /**
   * Kill the tray application.
   */
  kill(): void {
    if (this.systray) {
      this.systray.kill(false);
    }
  }
}
