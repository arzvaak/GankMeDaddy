import { EventEmitter } from 'events';
import * as electronUpdater from 'electron-updater';
import { ProgressInfo, UpdateInfo } from 'electron-updater';

const { autoUpdater } = electronUpdater;

export type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error' | 'disabled';

export interface UpdateState {
  phase: UpdatePhase;
  currentVersion: string;
  availableVersion: string | null;
  progress: number;
  message: string;
}

export class UpdateManager extends EventEmitter {
  private state: UpdateState;
  private initialized = false;
  private checkPromise: Promise<unknown> | null = null;

  constructor(private readonly currentVersion: string, private readonly packaged: boolean) {
    super();
    this.state = {
      phase: packaged ? 'idle' : 'disabled',
      currentVersion,
      availableVersion: null,
      progress: 0,
      message: packaged ? 'Updates are checked automatically.' : 'Update checks are available in installed builds.',
    };
  }

  initialize(): void {
    if (this.initialized || !this.packaged) return;
    this.initialized = true;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.logger = console;

    autoUpdater.on('checking-for-update', () => this.setState({ phase: 'checking', message: 'Checking GitHub for updates…' }));
    autoUpdater.on('update-available', (info: UpdateInfo) => this.setState({
      phase: 'available',
      availableVersion: info.version,
      progress: 0,
      message: `Version ${info.version} is ready to download.`,
    }));
    autoUpdater.on('update-not-available', (info: UpdateInfo) => this.setState({
      phase: 'up-to-date',
      availableVersion: info.version || null,
      progress: 0,
      message: `Version ${this.currentVersion} is up to date.`,
    }));
    autoUpdater.on('download-progress', (progress: ProgressInfo) => this.setState({
      phase: 'downloading',
      progress: Math.max(0, Math.min(100, Math.round(progress.percent))),
      message: `Downloading version ${this.state.availableVersion || 'update'}…`,
    }));
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => this.setState({
      phase: 'downloaded',
      availableVersion: info.version,
      progress: 100,
      message: `Version ${info.version} is ready. Restart to install it.`,
    }));
    autoUpdater.on('error', (error: Error) => this.setState({
      phase: 'error',
      message: `Update check failed: ${error.message}`,
    }));
  }

  getState(): UpdateState {
    return { ...this.state };
  }

  async check(): Promise<UpdateState> {
    if (!this.packaged) return this.getState();
    if (this.checkPromise) {
      await this.checkPromise;
      return this.getState();
    }
    this.checkPromise = autoUpdater.checkForUpdates()
      .catch(error => this.setState({ phase: 'error', message: `Update check failed: ${(error as Error).message}` }))
      .finally(() => { this.checkPromise = null; });
    await this.checkPromise;
    return this.getState();
  }

  async download(): Promise<UpdateState> {
    if (this.state.phase !== 'available') return this.getState();
    this.setState({ phase: 'downloading', progress: 0, message: `Downloading version ${this.state.availableVersion}…` });
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.setState({ phase: 'error', message: `Update download failed: ${(error as Error).message}` });
    }
    return this.getState();
  }

  install(): boolean {
    if (this.state.phase !== 'downloaded') return false;
    autoUpdater.quitAndInstall(false, true);
    return true;
  }

  private setState(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, ...partial };
    this.emit('state', this.getState());
  }
}
