// ============================================================================
// GankMeDaddy — Coaching Engine
// Main coaching logic: general mid-lane rules + hero-specific strategies
// Compares live game state against Topson's real STRATZ data benchmarks
// ============================================================================

import {
  MatchSnapshot,
  CoachingRecommendation,
  HeroStrategy,
  HERO_NAMES,
  SUPPORTED_HERO_IDS,
} from './types';
import { strategyRegistry } from '../strategies';
import { VoiceOutput } from '../voice/voiceOutput';
import { ConfigManager } from '../config/configManager';

// Dota 2 item name constants (GSI uses these internal names)
const ITEM_BOTTLE = 'bottle';
const ITEM_BKB = 'black_king_bar';
const ITEM_BLINK = 'blink';
const ITEM_AGHS = 'ultimate_scepter';
const ITEM_SHARD = 'aghanims_shard';

export class CoachingEngine {
  private voice: VoiceOutput;
  private config: ConfigManager;
  private lastClockTime: number = -999;
  private lastRumeReminder: number = -999;
  private lastLotusReminder: number = -999;
  private lastDaytime: boolean | null = null;
  private lastPhase: string = '';
  private deathCount: number = 0;
  private matchStarted: boolean = false;
  private topsonItemsAdvised: Set<string> = new Set();
  private lhCheckpointsHit: Set<number> = new Set(); // track which LH checkpoints (600, 1200, 1800) fired
  private startingItemsAdvised: boolean = false;
  private lastItemAdviceClockTime: number = -999;

  constructor(voice: VoiceOutput, config: ConfigManager) {
    this.voice = voice;
    this.config = config;
  }

  /**
   * Called when a new match starts. Resets state.
   */
  onMatchStart(heroId: number): void {
    this.lastClockTime = -999;
    this.lastRumeReminder = -999;
    this.lastLotusReminder = -999;
    this.lastDaytime = null;
    this.lastPhase = '';
    this.deathCount = 0;
    this.matchStarted = true;
    this.topsonItemsAdvised.clear();
    this.lhCheckpointsHit.clear();
    this.startingItemsAdvised = false;
    this.lastItemAdviceClockTime = -999;

    const heroName = HERO_NAMES[heroId] || 'your hero';
    const cfg = this.config.get();
    const isEnabled = cfg.enabledHeroIds.includes(heroId);

    if (isEnabled) {
      this.voice.speakNow(`Match started. Playing ${heroName}. Coaching active. Full Topson mode.`);
    } else {
      this.voice.speakNow(`Match started with ${heroName}. This hero is not in your coaching set. Coaching paused.`);
      this.matchStarted = false;
    }
  }

  /**
   * Called when match ends.
   */
  onMatchEnd(): void {
    this.matchStarted = false;
    this.voice.speakNow('Match over. Good game.');
  }

  /**
   * Process a match snapshot and generate coaching advice.
   */
  processSnapshot(snapshot: MatchSnapshot): void {
    if (!this.matchStarted) return;

    const cfg = this.config.get();
    if (!cfg.enabledHeroIds.includes(snapshot.hero.heroId)) return;

    const recommendations: CoachingRecommendation[] = [];

    // Trigger starting items advice if during pre-game or early start (clockTime <= 15) and not yet done
    if (!this.startingItemsAdvised && snapshot.clockTime <= 15) {
      const profile = snapshot.stratzContext?.topsonProfile;
      if (profile && profile.startingItems && profile.startingItems.length > 0) {
        this.startingItemsAdvised = true;
        recommendations.push({
          priority: 'critical',
          category: 'item',
          message: `Topson's starting items: ${profile.startingItems.join(', ')}.`,
          cooldownKey: 'starting_items',
          cooldownSeconds: 999999,
        });
      }
    }

    // 1. General mid-lane rules (all heroes)
    recommendations.push(...this.generalMidRules(snapshot));

    // 2. Creep score checkpoints at 10/20/30 min vs Topson
    recommendations.push(...this.creepScoreCheckpoints(snapshot));

    // 3. Topson item timing comparisons (data-driven from STRATZ)
    recommendations.push(...this.topsonItemTimingAdvice(snapshot));

    // 4. Hero-specific strategy
    const strategy = strategyRegistry.get(snapshot.hero.heroId);
    if (strategy) {
      recommendations.push(...strategy.analyzeSnapshot(snapshot));
    }

    // Send all recommendations to voice queue
    for (const rec of recommendations) {
      this.voice.queueRecommendation(rec);
    }

    // Periodic cooldown cleanup
    this.voice.cleanupCooldowns();
    this.lastClockTime = snapshot.clockTime;
  }

  // =========================================================================
  // General Mid-Lane Rules
  // =========================================================================

  private generalMidRules(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    // --- Rune reminders ---
    // Water runes: every 2 minutes from 2:00 to 6:00
    // Power runes: every 2 minutes from 6:00
    const nextRuneTime = this.getNextRuneTime(t);
    if (nextRuneTime !== null) {
      const timeUntilRune = nextRuneTime - t;
      if (timeUntilRune > 0 && timeUntilRune <= 20 && (nextRuneTime !== this.lastRumeReminder)) {
        this.lastRumeReminder = nextRuneTime;
        const runeType = nextRuneTime < 360 ? 'Water rune' : 'Power rune';
        const mins = Math.floor(nextRuneTime / 60);
        const secs = nextRuneTime % 60;
        recs.push({
          priority: 'high',
          category: 'rune',
          message: `${runeType} spawning at ${mins}:${secs.toString().padStart(2, '0')}. Move to rune now.`,
          cooldownKey: `rune_${nextRuneTime}`,
          cooldownSeconds: 60,
        });
      }
    }

    // --- Lotus Pool reminder (every 3 minutes from 3:00) ---
    const nextLotusTime = this.getNextLotusTime(t);
    if (nextLotusTime !== null) {
      const timeUntilLotus = nextLotusTime - t;
      if (timeUntilLotus > 0 && timeUntilLotus <= 20 && (nextLotusTime !== this.lastLotusReminder)) {
        this.lastLotusReminder = nextLotusTime;
        recs.push({
          priority: 'medium',
          category: 'lotus',
          message: `Lotus Pool respawning soon. Consider picking up a lotus.`,
          cooldownKey: `lotus_${nextLotusTime}`,
          cooldownSeconds: 120,
        });
      }
    }

    // --- Day/Night transition ---
    if (snap.isDaytime !== this.lastDaytime && this.lastDaytime !== null) {
      this.lastDaytime = snap.isDaytime;
      if (snap.isDaytime) {
        recs.push({
          priority: 'low',
          category: 'timing',
          message: 'Daytime. Vision advantage. Play more aggressive.',
          cooldownKey: 'daynight',
          cooldownSeconds: 120,
        });
      } else {
        recs.push({
          priority: 'medium',
          category: 'timing',
          message: 'Nighttime. Reduced vision. Watch for ganks.',
          cooldownKey: 'daynight',
          cooldownSeconds: 120,
        });
      }
    }
    if (this.lastDaytime === null) this.lastDaytime = snap.isDaytime;

    // --- Phase transitions ---
    if (snap.phase !== this.lastPhase && this.lastPhase !== '') {
      if (snap.phase === 'midgame') {
        recs.push({
          priority: 'high',
          category: 'rotation',
          message: '10 minutes. Laning phase is over. Start looking for rotations and objectives. Play like Topson — be everywhere.',
          cooldownKey: 'phase_midgame',
          cooldownSeconds: 300,
        });
      } else if (snap.phase === 'lategame') {
        recs.push({
          priority: 'high',
          category: 'rotation',
          message: '25 minutes. Late game. Group with your team for key fights. Play around B K B timing.',
          cooldownKey: 'phase_lategame',
          cooldownSeconds: 300,
        });
      }
    }
    this.lastPhase = snap.phase;

    // --- Death tracking ---
    if (snap.player.deaths > this.deathCount) {
      this.deathCount = snap.player.deaths;
      const mins = Math.floor(t / 60);
      if (this.deathCount <= 2 && mins < 10) {
        recs.push({
          priority: 'high',
          category: 'death',
          message: `You died at ${mins} minutes. ${this.deathCount} deaths in laning. Be more careful with positioning.`,
          cooldownKey: `death_${this.deathCount}`,
          cooldownSeconds: 30,
        });
      } else if (this.deathCount >= 4) {
        recs.push({
          priority: 'critical',
          category: 'death',
          message: `${this.deathCount} deaths. Focus on farming safely and avoid solo plays until you have a key item.`,
          cooldownKey: 'death_many',
          cooldownSeconds: 60,
        });
      }
    }

    // --- Low HP warning (below 30%) ---
    if (snap.hero.alive && snap.hero.healthPercent < 30 && snap.hero.healthPercent > 0) {
      recs.push({
        priority: 'high',
        category: 'positioning',
        message: 'Low health. Back off or use a salve.',
        cooldownKey: 'low_hp',
        cooldownSeconds: 15,
      });
    }

    // --- Low mana warning (below 20%) ---
    if (snap.hero.alive && snap.hero.manaPercent < 20 && snap.hero.manaPercent > 0 && snap.hero.level >= 3) {
      recs.push({
        priority: 'medium',
        category: 'mana',
        message: 'Low mana. Use bottle or clarity.',
        cooldownKey: 'low_mana',
        cooldownSeconds: 20,
      });
    }

    // --- Last hits benchmark ---
    if (snap.phase === 'laning' && t > 0) {
      const mins = t / 60;
      const lhPerMin = snap.player.lastHits / Math.max(mins, 1);
      if (mins >= 5 && lhPerMin < 5) {
        recs.push({
          priority: 'medium',
          category: 'farming',
          message: `Your last hits are low. ${snap.player.lastHits} in ${Math.floor(mins)} minutes. Focus on getting every creep.`,
          cooldownKey: 'lh_low',
          cooldownSeconds: 120,
        });
      }
    }

    // --- Tower threat ---
    const midTowers = snap.buildings.filter(b =>
      b.name.includes('mid') && b.name.includes('tower') &&
      b.health > 0 && b.health < b.maxHealth * 0.4
    );
    for (const tower of midTowers) {
      recs.push({
        priority: 'high',
        category: 'positioning',
        message: `${tower.team} mid tower is low. ${tower.team === 'radiant' ? 'Defend it' : 'Push it down'}.`,
        cooldownKey: `tower_${tower.name}`,
        cooldownSeconds: 60,
      });
    }

    return recs;
  }

  // =========================================================================
  // Topson Item Timing Advice (Data-Driven from STRATZ)
  // =========================================================================

  private topsonItemTimingAdvice(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const profile = snap.stratzContext.topsonProfile;
    if (!profile || profile.itemTimings.length === 0) return recs;

    const t = snap.clockTime;

    // Prevent spamming item recommendations too close together (at least 150 seconds apart)
    if (this.lastItemAdviceClockTime !== -999 && t - this.lastItemAdviceClockTime < 150) {
      return recs;
    }

    const playerGold = snap.player.gold;
    const playerItems = new Set(snap.items.map(i => i.itemName.toLowerCase()));

    for (const timing of profile.itemTimings) {
      const adviceKey = `topson_item_${timing.itemId}`;

      // Skip if we already advised this item in this match
      if (this.topsonItemsAdvised.has(adviceKey)) continue;

      // Skip items with low purchase rate (< 30%)
      if (timing.purchaseRate < 0.3) continue;

      const itemNameLower = timing.itemName.toLowerCase()
        .replace(/'/g, '')
        .replace(/\s+/g, '_');

      // Check if player already has this item
      const hasItem = playerItems.has(itemNameLower) ||
        snap.items.some(i => i.itemName.toLowerCase().includes(itemNameLower.split('_')[0]));
      if (hasItem) {
        this.topsonItemsAdvised.add(adviceKey);
        continue;
      }

      // Compare player's timing against Topson's median
      const timingDiff = t - timing.medianTime;

      // If we're past Topson's median timing and still don't have the item
      if (timingDiff > 60 && timingDiff < 300) {
        // We're behind Topson's timing
        const topsonMins = Math.floor(timing.medianTime / 60);
        const topsonSecs = Math.floor(timing.medianTime % 60);
        this.topsonItemsAdvised.add(adviceKey);
        this.lastItemAdviceClockTime = t;

        recs.push({
          priority: 'medium',
          category: 'item',
          message: `Topson usually has ${timing.itemName} by ${topsonMins}:${topsonSecs.toString().padStart(2, '0')}. You're behind on this timing. Focus on farming for it.`,
          cooldownKey: adviceKey,
          cooldownSeconds: 180,
        });
        break; // Only one item timing advice at a time
      }

      // If we're approaching Topson's timing and have enough gold — suggest buying
      if (timingDiff >= -30 && timingDiff <= 60) {
        const itemInfo = snap.stratzContext.topsonProfile?.itemTimings.find(
          it => it.itemId === timing.itemId
        );
        // We can't check exact cost from GSI, but we can note the timing window
        this.topsonItemsAdvised.add(adviceKey);
        this.lastItemAdviceClockTime = t;

        recs.push({
          priority: 'high',
          category: 'item',
          message: `Item timing window: Topson gets ${timing.itemName} around now. Make sure you're on track.`,
          cooldownKey: adviceKey,
          cooldownSeconds: 180,
        });
        break;
      }
    }

    // --- GPM comparison ---
    if (profile.avgGPM > 0 && t > 300) {
      const gpmRatio = snap.player.gpm / profile.avgGPM;
      if (gpmRatio < 0.7) {
        recs.push({
          priority: 'medium',
          category: 'farming',
          message: `Your GPM is ${snap.player.gpm}. Topson averages ${Math.round(profile.avgGPM)} on this hero. Farm more aggressively.`,
          cooldownKey: 'gpm_compare',
          cooldownSeconds: 180,
        });
      } else if (gpmRatio > 1.2) {
        recs.push({
          priority: 'low',
          category: 'farming',
          message: `Great farm. Your GPM is above Topson's average. Use your advantage to make plays.`,
          cooldownKey: 'gpm_ahead',
          cooldownSeconds: 300,
        });
      }
    }

    return recs;
  }

  // =========================================================================
  // Creep Score Checkpoints (10/20/30 min vs Topson STRATZ data)
  // =========================================================================

  private creepScoreCheckpoints(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    // Checkpoints at 10, 20, 30 minutes (600, 1200, 1800 seconds)
    const checkpoints = [600, 1200, 1800];

    for (const cp of checkpoints) {
      // Fire within a 10-second window after the checkpoint
      if (t >= cp && t <= cp + 10 && !this.lhCheckpointsHit.has(cp)) {
        this.lhCheckpointsHit.add(cp);
        const mins = cp / 60;
        const playerLH = snap.player.lastHits;

        // Compare against Topson's data if available
        const profile = snap.stratzContext.topsonProfile;
        if (profile && profile.avgGPM > 0) {
          // Estimate Topson's LH at this time from his avg LH data
          // Use a rough heuristic: avgGPM correlates with ~1 LH per 3.5 gold/min
          // More accurately, we use lastHitsPerMinute from STRATZ if available
          const topsonEstLH = Math.round((profile.avgGPM / 40) * mins); // rough estimate

          const diff = playerLH - topsonEstLH;
          if (diff >= 10) {
            recs.push({
              priority: 'low', category: 'farming',
              message: `${mins} minute mark: ${playerLH} last hits. You're ahead of Topson's pace. Great farming.`,
              cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
            });
          } else if (diff >= -10) {
            recs.push({
              priority: 'medium', category: 'farming',
              message: `${mins} minute mark: ${playerLH} last hits. On par with Topson's average pace. Keep it up.`,
              cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
            });
          } else {
            recs.push({
              priority: 'high', category: 'farming',
              message: `${mins} minute mark: ${playerLH} last hits. Topson averages around ${topsonEstLH} by now. You need to farm faster.`,
              cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
            });
          }
        } else {
          // No Topson data — just report the number
          recs.push({
            priority: 'medium', category: 'farming',
            message: `${mins} minute mark: ${playerLH} last hits.`,
            cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
          });
        }
      }
    }

    return recs;
  }

  // =========================================================================
  // Timer helpers
  // =========================================================================

  private getNextRuneTime(currentTime: number): number | null {
    // Water runes at 2:00, 4:00 (120, 240)
    // Power runes from 6:00 every 2 minutes (360, 480, 600, ...)
    const runeIntervals = [120, 240, 360];
    for (let t = 480; t <= 3600; t += 120) {
      runeIntervals.push(t);
    }

    for (const t of runeIntervals) {
      if (t > currentTime) return t;
    }
    return null;
  }

  private getNextLotusTime(currentTime: number): number | null {
    // Lotus Pool: every 3 minutes from 3:00
    for (let t = 180; t <= 3600; t += 180) {
      if (t > currentTime) return t;
    }
    return null;
  }
}
