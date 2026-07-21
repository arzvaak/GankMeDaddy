// ============================================================================
// GankMeDaddy — System Tray Application
// Lightweight system tray UI with hero selection and status display
// ============================================================================

import SysTray from 'systray2';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigManager } from '../config/configManager';
import { Role } from '../coaching/types';

const TRAY_ICON_B64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABMLAAATCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A/2oA//9qAP//agD/////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD///8A////AP///wD///8A////AP9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD/////AP///wD///8A////AP///wD///8A/2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA/////wD///8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD///8A/2oA//9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD//2oA/////wD///8A////AP///wD///8A////AP9qAP//agD//2oA//9qAP//agD//2oA//9qAP//agD/////AP///wD///8A////AP///wD///8A////AP///wD/agD//2oA//9qAP//agD//2oA//9qAP////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP9qAP//agD//2oA/////wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

function volumeBar(vol: number): string {
  const filled = Math.round(vol / 10);
  return '▰'.repeat(filled) + '○'.repeat(10 - filled);
}

const POSITION_LABELS: Record<Role, string> = {
  mid: 'Mid',
  pos1: 'Safe Lane (Pos 1)',
  pos3: 'Off Lane (Pos 3)',
  pos4: 'Soft Support (Pos 4)',
  pos5: 'Hard Support (Pos 5)',
};

const POSITION_ORDER: Role[] = ['mid', 'pos1', 'pos3', 'pos4', 'pos5'];

export interface TrayCallbacks {
  onToggleHero: (heroId: number) => void;
  onSetPosition: (role: Role) => void;
  onToggleVoice: () => void;
  onAdjustVolume: (delta: number) => void;
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

  start(): void {
    const cfg = this.config.get();

    const positionItems = POSITION_ORDER.map((role) => ({
      title: `${cfg.position === role ? '●' : '○'} ${POSITION_LABELS[role]}`,
      tooltip: `Set position to ${POSITION_LABELS[role]}`,
      checked: cfg.position === role,
      enabled: true,
    }));

    const menuItems = [
      { title: `Status: ${this.statusText}`, tooltip: 'Current status', enabled: false, checked: false },
      { title: `Position: ${POSITION_LABELS[cfg.position]}`, tooltip: 'Current position', enabled: false, checked: false },
      ...positionItems,
      { title: '─────────────', tooltip: '', enabled: false, checked: false },
      { title: `Voice: ${cfg.voiceEnabled ? 'ON' : 'OFF'}`, tooltip: 'Toggle voice', enabled: true, checked: false },
      { title: `Aggression: ${cfg.aggressionLevel}/10`, tooltip: 'Aggression level', enabled: false, checked: false },
      { title: `Volume: ${volumeBar(cfg.voiceVolume)} ${cfg.voiceVolume}%`, tooltip: 'Current volume level', enabled: false, checked: false },
      { title: '▲ Volume Up', tooltip: 'Increase volume by 10', enabled: true, checked: false },
      { title: '▼ Volume Down', tooltip: 'Decrease volume by 10', enabled: true, checked: false },
      { title: '─────────────', tooltip: '', enabled: false, checked: false },
      { title: 'Setup GSI Config', tooltip: 'Copy GSI config to Dota 2', enabled: true, checked: false },
      { title: 'Test Voice', tooltip: 'Test TTS output', enabled: true, checked: false },
      { title: '─────────────', tooltip: '', enabled: false, checked: false },
      { title: 'Quit', tooltip: 'Exit GankMeDaddy', enabled: true, checked: false },
    ];

    let trayIcon = TRAY_ICON_B64;
    const iconPath = path.resolve(__dirname, '../../dota2.ico');
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
        tooltip: 'GankMeDaddy — Dota 2 Coach',
        items: menuItems,
      },
      debug: false,
      copyDir: true,
    });

    this.systray.onClick(action => {
      const idx = action.seq_id;

      // 0: status
      // 1: "Position: X" label
      // 2..6: position options (5 items)
      // 7: separator
      // 8: voice toggle
      // 9: aggression
      // 10: volume display
      // 11: volume up
      // 12: volume down
      // 13: separator
      // 14: setup GSI
      // 15: test voice
      // 16: separator
      // 17: quit

      const posStart = 1;
      const posEnd = posStart + POSITION_ORDER.length - 1;

      if (idx >= 2 && idx <= posEnd) {
        const role = POSITION_ORDER[idx - 2];
        this.callbacks.onSetPosition(role);
        return;
      }

      const voiceIdx = 8;
      const volUpIdx = 11;
      const volDownIdx = 12;
      const setupIdx = 14;
      const testIdx = 15;
      const quitIdx = 17;

      if (idx === voiceIdx) {
        this.callbacks.onToggleVoice();
      } else if (idx === volUpIdx) {
        this.callbacks.onAdjustVolume(10);
      } else if (idx === volDownIdx) {
        this.callbacks.onAdjustVolume(-10);
      } else if (idx === setupIdx) {
        this.callbacks.onSetupGSI();
      } else if (idx === testIdx) {
        this.callbacks.onTestVoice();
      } else if (idx === quitIdx) {
        this.callbacks.onQuit();
      }
    });

    console.log('[TRAY] System tray started');
  }

  updateStatus(status: string): void {
    this.statusText = status;
    console.log(`[STATUS] ${status}`);
  }

  kill(): void {
    if (this.systray) {
      this.systray.kill(false);
    }
  }
}
