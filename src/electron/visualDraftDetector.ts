import { desktopCapturer, NativeImage, nativeImage } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { DOTA_HEROES } from '../coaching/heroesData';

export interface VisualDraftResult {
  radiant: number[];
  dire: number[];
  radiantSlots: number[];
  direSlots: number[];
  confidence: number;
  windowName: string;
  capturedAt: number;
}

interface Template { heroId: number; feature: Float32Array; }
export interface VisualSlotMatch { heroId: number; score: number; margin: number; }

const FEATURE_WIDTH = 32;
const FEATURE_HEIGHT = 18;
const STABLE_FRAMES = 2;
const MIN_SCORE = .47;
const MIN_MARGIN = .08;

/**
 * Read-only draft detector for player modes where Valve intentionally leaves
 * the GSI draft object empty. It captures only the Dota window thumbnail and
 * compares the ten top-bar pick slots with locally bundled hero portraits.
 */
export class VisualDraftDetector extends EventEmitter {
  private active = false;
  private timer: NodeJS.Timeout | null = null;
  private templates: Template[] = [];
  private history: number[][] = Array.from({ length: 10 }, () => []);
  private lastSignature = '';
  private scanInProgress = false;

  constructor(private readonly assetRoot: string) {
    super();
    this.loadTemplates();
  }

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.history = Array.from({ length: 10 }, () => []);
    this.lastSignature = '';
    if (active) {
      void this.scan();
      this.timer = setInterval(() => void this.scan(), 850);
    } else if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  stop(): void {
    this.setActive(false);
  }

  selfTest(heroId = 22): boolean {
    const file = path.join(this.assetRoot, 'heroes', `${heroId}.png`);
    if (!fs.existsSync(file)) return false;
    const match = this.match(nativeImage.createFromPath(file));
    return match.heroId === heroId && match.score > .98;
  }

  analyzeImage(frame: NativeImage): { radiant: number[]; dire: number[]; matches: VisualSlotMatch[]; confidence: number } {
    const matches = this.pickSlots(frame).map(slot => this.match(slot));
    const radiant = matches.slice(0, 5).map(match => match.heroId).filter(id => id > 0);
    const dire = matches.slice(5).map(match => match.heroId).filter(id => id > 0);
    const accepted = matches.filter(match => match.heroId > 0);
    const confidence = accepted.length ? accepted.reduce((sum, match) => sum + match.score, 0) / accepted.length : 0;
    return { radiant, dire, matches, confidence };
  }

  private loadTemplates(): void {
    this.templates = DOTA_HEROES.flatMap(hero => {
      const file = path.join(this.assetRoot, 'heroes', `${hero.id}.png`);
      if (!fs.existsSync(file)) return [];
      const image = nativeImage.createFromPath(file);
      return image.isEmpty() ? [] : [{ heroId: hero.id, feature: this.feature(image) }];
    });
  }

  private async scan(): Promise<void> {
    if (!this.active || this.scanInProgress) return;
    this.scanInProgress = true;
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false,
      });
      const source = sources.find(candidate => /dota\s*2/i.test(candidate.name));
      if (!source || source.thumbnail.isEmpty()) {
        this.emit('status', { state: 'window-missing', message: 'Waiting for the Dota 2 window.' });
        return;
      }
      const size = source.thumbnail.getSize();
      if (size.width < 900 || size.height < 500 || this.isBlank(source.thumbnail)) {
        this.emit('status', { state: 'capture-unavailable', message: 'Dota capture is unavailable. Borderless Window is recommended.' });
        return;
      }

      const matches = this.pickSlots(source.thumbnail).map(slot => this.match(slot));
      const stable = matches.map((match, index) => this.stabilize(index, match));
      const radiantSlots = stable.slice(0, 5);
      const direSlots = stable.slice(5);
      const radiant = radiantSlots.filter(id => id > 0);
      const dire = direSlots.filter(id => id > 0);
      const accepted = matches.filter(match => match.heroId > 0 && match.score >= MIN_SCORE && match.margin >= MIN_MARGIN);
      const confidence = accepted.length ? accepted.reduce((sum, match) => sum + match.score, 0) / accepted.length : 0;
      const signature = `${radiant.join(',')}|${dire.join(',')}`;
      this.emit('status', { state: 'scanning', message: 'Reading the Dota draft automatically.', confidence });
      if (signature !== this.lastSignature && radiant.length + dire.length > 0) {
        this.lastSignature = signature;
        const result: VisualDraftResult = { radiant, dire, radiantSlots, direSlots, confidence, windowName: source.name, capturedAt: Date.now() };
        this.emit('draft', result);
      }
    } catch (error) {
      this.emit('status', { state: 'error', message: `Visual draft reader: ${(error as Error).message}` });
    } finally {
      this.scanInProgress = false;
    }
  }

  private pickSlots(frame: NativeImage): NativeImage[] {
    const { width, height } = frame.getSize();
    // Valve uses the same centered 10-slot header in Ranked All Pick,
    // Unranked All Pick, and Turbo. These ratios were verified against the
    // live 1920x1080 player draft and strategy screens in July 2026.
    const slotWidth = Math.max(55, Math.round(width * .06));
    const slotHeight = Math.max(34, Math.round(slotWidth * 9 / 16));
    // Skip the thin per-player colour strip above each portrait.
    const y = Math.max(0, Math.round(height * .0065));
    const radiantCenters = [.139, .2045, .2695, .3345, .3995];
    const direCenters = [.5995, .6645, .7295, .7945, .8595];
    return [...radiantCenters, ...direCenters].map(center => frame.crop({
      x: Math.max(0, Math.round(width * center - slotWidth / 2)),
      y,
      width: Math.min(slotWidth, width),
      height: Math.min(slotHeight, height - y),
    }));
  }

  private match(image: NativeImage): VisualSlotMatch {
    if (image.isEmpty() || !this.hasPortraitContent(image)) return { heroId: 0, score: 0, margin: 0 };
    const feature = this.feature(image);
    let best = { heroId: 0, score: -1 };
    let second = -1;
    for (const template of this.templates) {
      const score = this.correlation(feature, template.feature);
      if (score > best.score) {
        second = best.score;
        best = { heroId: template.heroId, score };
      } else if (score > second) second = score;
    }
    const margin = best.score - second;
    return best.score >= MIN_SCORE && margin >= MIN_MARGIN
      ? { ...best, margin }
      : { heroId: 0, score: best.score, margin };
  }

  private stabilize(index: number, match: VisualSlotMatch): number {
    const history = this.history[index];
    history.push(match.heroId);
    if (history.length > STABLE_FRAMES) history.shift();
    if (match.heroId === 0 || history.length < STABLE_FRAMES) return 0;
    return history.every(id => id === match.heroId) ? match.heroId : 0;
  }

  private feature(image: NativeImage): Float32Array {
    const resized = image.resize({ width: FEATURE_WIDTH, height: FEATURE_HEIGHT, quality: 'best' });
    const bitmap = resized.toBitmap();
    const values = new Float32Array(FEATURE_WIDTH * FEATURE_HEIGHT * 4);
    let mean = 0;
    let previousLuma = 0;
    for (let pixel = 0; pixel < FEATURE_WIDTH * FEATURE_HEIGHT; pixel++) {
      const offset = pixel * 4;
      const blue = bitmap[offset] / 255;
      const green = bitmap[offset + 1] / 255;
      const red = bitmap[offset + 2] / 255;
      const luma = red * .299 + green * .587 + blue * .114;
      values[offset] = red - green;
      values[offset + 1] = green - blue;
      values[offset + 2] = luma;
      values[offset + 3] = pixel % FEATURE_WIDTH ? luma - previousLuma : 0;
      previousLuma = luma;
      mean += luma;
    }
    mean /= FEATURE_WIDTH * FEATURE_HEIGHT;
    for (let pixel = 0; pixel < FEATURE_WIDTH * FEATURE_HEIGHT; pixel++) values[pixel * 4 + 2] -= mean;
    return values;
  }

  private correlation(left: Float32Array, right: Float32Array): number {
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index++) {
      dot += left[index] * right[index];
      leftNorm += left[index] * left[index];
      rightNorm += right[index] * right[index];
    }
    return dot / Math.max(.0001, Math.sqrt(leftNorm * rightNorm));
  }

  private hasPortraitContent(image: NativeImage): boolean {
    const bitmap = image.resize({ width: 24, height: 14 }).toBitmap();
    let sum = 0;
    let sumSquares = 0;
    const pixels = bitmap.length / 4;
    for (let offset = 0; offset < bitmap.length; offset += 4) {
      const luma = (bitmap[offset] * .114 + bitmap[offset + 1] * .587 + bitmap[offset + 2] * .299) / 255;
      sum += luma;
      sumSquares += luma * luma;
    }
    const mean = sum / pixels;
    const variance = sumSquares / pixels - mean * mean;
    return mean > .06 && variance > .006;
  }

  private isBlank(image: NativeImage): boolean {
    const bitmap = image.resize({ width: 24, height: 14 }).toBitmap();
    let min = 255;
    let max = 0;
    for (let index = 0; index < bitmap.length; index += 4) {
      const luma = (bitmap[index] + bitmap[index + 1] + bitmap[index + 2]) / 3;
      min = Math.min(min, luma);
      max = Math.max(max, luma);
    }
    return max - min < 8;
  }
}
