import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gank', {
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  start: () => ipcRenderer.invoke('coach:start'),
  stop: () => ipcRenderer.invoke('coach:stop'),
  testVoice: () => ipcRenderer.invoke('coach:test-voice'),
  setupGSI: () => ipcRenderer.invoke('coach:setup-gsi'),
  updateConfig: (partial: unknown) => ipcRenderer.invoke('config:update', partial),
  setPosition: (role: string) => ipcRenderer.invoke('config:set-position', role),
  toggleHero: (heroId: number) => ipcRenderer.invoke('config:toggle-hero', heroId),
  chooseDotaPath: () => ipcRenderer.invoke('config:choose-dota-path'),
  saveSetup: (input: unknown) => ipcRenderer.invoke('config:save-setup', input),
  onState: (callback: (value: unknown) => void) => ipcRenderer.on('runtime:state', (_event, value) => callback(value)),
  onSnapshot: (callback: (value: unknown) => void) => ipcRenderer.on('runtime:snapshot', (_event, value) => callback(value)),
  onActivity: (callback: (value: unknown) => void) => ipcRenderer.on('runtime:activity', (_event, value) => callback(value)),
});
