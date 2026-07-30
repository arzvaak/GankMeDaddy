import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, safeStorage, shell, Tray } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { GankMeDaddyApp } from '../app/GankMeDaddyApp';
import { AppConfig } from '../config/configManager';
import { DOTA_HEROES } from '../coaching/heroesData';
import { HERO_ROLES, SUPPORTED_HERO_IDS, Role } from '../coaching/types';
import { strategyRegistry } from '../strategies';
import { VisualDraftDetector, VisualDraftResult } from './visualDraftDetector';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let coach: GankMeDaddyApp;
let visualDraft: VisualDraftDetector;
const smokeTest = process.argv.includes('--smoke-test');

const rendererPath = path.resolve(__dirname, '../../src/renderer/index.html');
const preloadPath = path.resolve(__dirname, 'preload.js');
const rendererAssetPath = path.resolve(__dirname, '../../src/renderer/assets');

function resourceRoot(): string {
  return app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../..');
}

function secretPath(): string {
  return path.join(app.getPath('userData'), 'secrets.json');
}

function loadToken(): string {
  try {
    const payload = JSON.parse(fs.readFileSync(secretPath(), 'utf8')) as { encrypted?: string; plain?: string };
    if (payload.encrypted && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(payload.encrypted, 'base64'));
    }
    return payload.plain || '';
  } catch {
    return '';
  }
}

function saveToken(token: string): void {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  const payload = safeStorage.isEncryptionAvailable()
    ? { encrypted: safeStorage.encryptString(token).toString('base64') }
    : { plain: token };
  fs.writeFileSync(secretPath(), JSON.stringify(payload), 'utf8');
}

function bootstrap() {
  const config = coach.getConfig();
  const requirements = {
    token: Boolean(loadToken()),
    steam: config.steamAccountId > 0,
    dotaPath: fs.existsSync(path.join(config.dota2Path, 'game', 'dota')),
    gsi: fs.existsSync(coach.config.getGSIConfigPath()),
    launchOptions: config.launchOptionsConfirmed,
  };
  return {
    config,
    state: coach.getState(),
    tokenConfigured: requirements.token,
    requirements: {
      ...requirements,
      ready: Object.values(requirements).every(Boolean),
    },
    appVersion: app.getVersion(),
    heroes: SUPPORTED_HERO_IDS.filter(id => strategyRegistry.has(id)).map(id => {
      const hero = DOTA_HEROES.find(candidate => candidate.id === id);
      return { id, name: hero?.name || `Hero ${id}`, attr: hero?.attr || 'uni', role: HERO_ROLES[id] || 'mid' };
    }),
    draftHeroes: DOTA_HEROES.map(hero => ({ ...hero, portrait: `assets/heroes/${hero.id}.png` })),
  };
}

function send(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function buildTrayMenu(): void {
  if (!tray) return;
  const state = coach.getState();
  const cfg = coach.getConfig();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: state.status, enabled: false },
    { type: 'separator' },
    { label: 'Open GankMeDaddy', click: showWindow },
    {
      label: state.running ? 'Stop coaching' : 'Start coaching',
      click: async () => state.running ? coach.stop() : coach.start(loadToken()),
    },
    { label: 'Voice coaching', type: 'checkbox', checked: cfg.voiceEnabled, click: item => coach.updateConfig({ voiceEnabled: item.checked }) },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } },
  ]));
}

function showWindow(): void {
  mainWindow?.show();
  mainWindow?.focus();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    x: smokeTest ? -10000 : undefined,
    y: smokeTest ? -10000 : undefined,
    backgroundColor: '#080b10',
    title: 'GankMeDaddy',
    icon: path.join(resourceRoot(), 'app.ico'),
    show: smokeTest,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  void mainWindow.loadFile(rendererPath);
  mainWindow.once('ready-to-show', () => {
    if (!smokeTest) mainWindow?.show();
  });
  mainWindow.webContents.once('did-finish-load', async () => {
    if (!smokeTest || !mainWindow) return;
    try {
      const recognitionReady = visualDraft.selfTest();
      const result = await mainWindow.webContents.executeJavaScript(`(() => {
        document.querySelector('[data-enemy-slot="0"]')?.click();
        return {
          title: document.title,
          pages: document.querySelectorAll('.page').length,
          heroCards: document.querySelectorAll('.hero-card').length,
          tutorialSteps: document.querySelectorAll('.tutorial-step').length,
          bundledImages: [...document.images].filter(image => image.complete && image.naturalWidth > 0).length,
          draftPage: Boolean(document.querySelector('#page-draft')),
          manualPicker: !document.querySelector('#enemy-hero-picker')?.hidden && document.querySelectorAll('[data-pick-enemy-hero]').length >= 100 && typeof window.gank?.setEnemyOverride === 'function',
          visualRecognition: ${recognitionReady},
          bridgeReady: typeof window.gank?.bootstrap === 'function' && typeof window.gank?.copyText === 'function'
        };
      })()`);
      console.log(`[SMOKE] ${JSON.stringify(result)}`);
      quitting = true;
      app.exit(result.bridgeReady && result.visualRecognition && result.draftPage && result.manualPicker && result.pages === 4 && result.tutorialSteps === 6 && result.bundledImages >= 4 ? 0 : 1);
    } catch (error) {
      console.error('[SMOKE] Renderer verification failed:', error);
      quitting = true;
      app.exit(1);
    }
  });
  mainWindow.on('close', event => {
    if (!quitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
}

function registerIpc(): void {
  ipcMain.handle('app:bootstrap', () => bootstrap());
  ipcMain.handle('app:refresh', () => bootstrap());
  ipcMain.handle('coach:start', async () => {
    await coach.start(loadToken());
    return coach.getState();
  });
  ipcMain.handle('coach:stop', () => {
    coach.stop();
    return coach.getState();
  });
  ipcMain.handle('coach:test-voice', () => coach.testVoice());
  ipcMain.handle('coach:setup-gsi', () => coach.setupGSI());
  ipcMain.handle('draft:set-enemy-override', (_event, slot: number, heroId: number | null) => coach.setEnemyOverride(slot, heroId));
  ipcMain.handle('draft:clear-enemy-overrides', () => coach.clearManualEnemyOverrides());
  ipcMain.handle('config:update', (_event, partial: Partial<AppConfig>) => coach.updateConfig(partial));
  ipcMain.handle('config:set-position', (_event, role: Role) => coach.setPosition(role));
  ipcMain.handle('config:toggle-hero', (_event, heroId: number) => coach.toggleHero(heroId));
  ipcMain.handle('config:choose-dota-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose your Dota 2 installation folder',
      defaultPath: coach.getConfig().dota2Path,
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('config:save-setup', async (_event, input: { token?: string; steamAccountId: number; dota2Path: string; gsiPort: number }) => {
    if (input.token?.trim()) saveToken(input.token.trim());
    coach.updateConfig({
      steamAccountId: Number(input.steamAccountId) || 0,
      dota2Path: input.dota2Path.trim(),
      gsiPort: Number(input.gsiPort) || 3001,
    });
    if (coach.getState().running) coach.stop();
    await coach.start(loadToken());
    return bootstrap();
  });
}

app.whenReady().then(async () => {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  coach = new GankMeDaddyApp(resourceRoot());
  visualDraft = new VisualDraftDetector(rendererAssetPath);
  visualDraft.on('draft', (result: VisualDraftResult) => {
    console.log(`[VISION] radiant=${result.radiant.join(',')} dire=${result.dire.join(',')} confidence=${result.confidence.toFixed(3)}`);
    coach.processVisualDraft(result.radiantSlots, result.direSlots, result.confidence);
  });
  visualDraft.on('status', status => send('runtime:capture', status));
  coach.on('state', state => {
    send('runtime:state', state);
    // Player-mode GSI can omit the hero-selection transition as well as the
    // draft object, so vision stays ready while coaching is enabled. The
    // detector's fixed draft-header geometry rejects menus and the in-game HUD.
    visualDraft.setActive(state.running);
    buildTrayMenu();
  });
  coach.on('snapshot', snapshot => send('runtime:snapshot', snapshot));
  coach.on('draft', draft => send('runtime:draft', draft));
  coach.on('activity', message => send('runtime:activity', { message, timestamp: Date.now() }));

  registerIpc();
  createWindow();

  const trayIcon = nativeImage.createFromPath(path.join(resourceRoot(), 'app.ico'));
  tray = new Tray(trayIcon);
  tray.setToolTip('GankMeDaddy — Dota 2 live coach');
  tray.on('double-click', showWindow);
  buildTrayMenu();

  const token = loadToken();
  if (token) await coach.start(token).catch(() => undefined);

  app.on('second-instance', showWindow);
});

app.on('before-quit', () => {
  quitting = true;
  visualDraft?.stop();
  coach?.stop();
});

app.on('window-all-closed', () => {
  // Keep the coach alive in the system tray.
});
