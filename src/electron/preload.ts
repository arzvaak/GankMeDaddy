import { clipboard, contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gank', {
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  refresh: () => ipcRenderer.invoke('app:refresh'),
  start: () => ipcRenderer.invoke('coach:start'),
  stop: () => ipcRenderer.invoke('coach:stop'),
  testVoice: () => ipcRenderer.invoke('coach:test-voice'),
  setupGSI: () => ipcRenderer.invoke('coach:setup-gsi'),
  setEnemyOverride: (slot: number, heroId: number | null) => ipcRenderer.invoke('draft:set-enemy-override', slot, heroId),
  clearEnemyOverrides: () => ipcRenderer.invoke('draft:clear-enemy-overrides'),
  updateConfig: (partial: unknown) => ipcRenderer.invoke('config:update', partial),
  setPosition: (role: string) => ipcRenderer.invoke('config:set-position', role),
  toggleHero: (heroId: number) => ipcRenderer.invoke('config:toggle-hero', heroId),
  chooseDotaPath: () => ipcRenderer.invoke('config:choose-dota-path'),
  saveSetup: (input: unknown) => ipcRenderer.invoke('config:save-setup', input),
  copyText: (value: string) => clipboard.writeText(value),
  onState: (callback: (value: unknown) => void) => ipcRenderer.on('runtime:state', (_event, value) => callback(value)),
  onSnapshot: (callback: (value: unknown) => void) => ipcRenderer.on('runtime:snapshot', (_event, value) => callback(value)),
  onDraft: (callback: (value: unknown) => void) => ipcRenderer.on('runtime:draft', (_event, value) => callback(value)),
  onCapture: (callback: (value: unknown) => void) => ipcRenderer.on('runtime:capture', (_event, value) => callback(value)),
  onActivity: (callback: (value: unknown) => void) => ipcRenderer.on('runtime:activity', (_event, value) => callback(value)),
});
