// ============================================================================
// GankMeDaddy — Coaching Engine
// Main coaching logic: role-aware rules + hero-specific strategies
// Compares live game state against pro STRATZ data benchmarks
// ============================================================================

import {
  MatchSnapshot,
  CoachingRecommendation,
  HERO_NAMES,
} from './types';
import { strategyRegistry } from '../strategies';
import { VoiceOutput } from '../voice/voiceOutput';

// Phase thresholds (seconds)
const MIDGAME_THRESHOLD = 600;
const LATEGAME_THRESHOLD = 1500;

// Item timing constants
const ITEM_ADVICE_COOLDOWN = 150;
const ITEM_BEHIND_WINDOW_START = 60;
const ITEM_BEHIND_WINDOW_END = 300;
const ITEM_WINDOW_LEAD = 30;

// Creep score checkpoint times (seconds)
const LH_CHECKPOINTS = [600, 1200, 1800];
const LH_CHECKPOINT_WINDOW = 10;

// Low HP/mana thresholds
const LOW_HP_THRESHOLD = 30;
const LOW_MANA_THRESHOLD = 20;
const LOW_MANA_MIN_LEVEL = 3;

// Last hit benchmark
const LH_PER_MIN_TARGET = 5;
const LH_BENCHMARK_MIN_MINUTES = 5;

// Tower threat threshold
const TOWER_LOW_HEALTH_RATIO = 0.4;

// GPM comparison
const GPM_THRESHOLD_BEHIND = 0.7;
const GPM_THRESHOLD_AHEAD = 1.2;
const GPM_COMPARE_MIN_TIME = 300;

// Death tracking
const LANING_DEATH_THRESHOLD = 2;
const LANING_DEATH_MIN_TIME = 10;
const MANY_DEATHS_THRESHOLD = 4;

// Rune timers (seconds)
const WATER_RUNE_INTERVAL = 120;
const POWER_RUNE_START = 360;
const POWER_RUNE_INTERVAL = 120;
const LOTUS_INTERVAL = 180;
const LOTUS_START = 180;
const MAX_RUNE_TIME = 3600;

const MAGICAL_ITEMS = [
  'kaya', 'veil_of_discord', 'dagon', 'euls_scepter', 'octarine_core', 
  'aghanims_scepter', 'witch_blade', 'aether_lens', 'bloodstone', 
  'phylactery', 'khanda', 'mage_slayer', 'shivas_guard', 'refresher_orb'
];

const PHYSICAL_ITEMS = [
  'desolator', 'daedalus', 'crystalis', 'battle_fury', 'armlet', 
  'shadow_blade', 'silver_edge', 'mask_of_madness', 'echo_sabre', 
  'harpoon', 'butterfly', 'monkey_king_bar', 'satanic', 'basher', 
  'abyssal_blade', 'swift_blink', 'nullifier'
];

export class CoachingEngine {
  private voice: VoiceOutput;
  private lastRumeReminder: number = -999;
  private lastLotusReminder: number = -999;
  private lastDaytime: boolean | null = null;
  private lastPhase: string = '';
  private deathCount: number = 0;
  private matchStarted: boolean = false;
  private proItemsAdvised: Set<string> = new Set();
  private lhCheckpointsHit: Set<number> = new Set();
  private startingItemsAdvised: boolean = false;
  private lastItemAdviceClockTime: number = -999;
  private detectedBuildType: 'magical' | 'physical' | 'none' = 'none';

  constructor(voice: VoiceOutput) {
    this.voice = voice;
  }

  /**
   * Called when a new match starts. Resets state.
   */
  onMatchStart(heroId: number, isGuideMode: boolean = false, hasData: boolean = false): void {
    this.lastRumeReminder = -999;
    this.lastLotusReminder = -999;
    this.lastDaytime = null;
    this.lastPhase = '';
    this.deathCount = 0;
    this.matchStarted = true;
    this.proItemsAdvised.clear();
    this.lhCheckpointsHit.clear();
    this.startingItemsAdvised = false;
    this.lastItemAdviceClockTime = -999;
    this.detectedBuildType = 'none';

    const heroName = HERO_NAMES[heroId] || 'your hero';

    if (hasData) {
      if (isGuideMode) {
        this.voice.speakNow(`Match started. Playing ${heroName}. Coaching active using STRATZ pro guides.`);
      } else {
        this.voice.speakNow(`Match started. Playing ${heroName}. Coaching active with pro benchmarks.`);
      }
    } else {
      this.voice.speakNow(`Match started with ${heroName}. No pro match data found. General laning coaching active.`);
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

    const recommendations: CoachingRecommendation[] = [];

    if (!this.startingItemsAdvised && snapshot.clockTime <= 15) {
      const profile = snapshot.stratzContext?.proProfile;
      if (profile && profile.startingItems && profile.startingItems.length > 0) {
        this.startingItemsAdvised = true;
        recommendations.push({
          priority: 'critical',
          category: 'item',
          message: `Recommended starting items: ${profile.startingItems.join(', ')}.`,
          cooldownKey: 'starting_items',
          cooldownSeconds: 999999,
        });
      }
    }

    if (snapshot.role === 'mid' || snapshot.role === 'pos1') {
      let magCount = 0;
      let physCount = 0;
      for (const item of snapshot.items) {
        const name = item.itemName.toLowerCase();
        if (MAGICAL_ITEMS.some(m => name.includes(m))) magCount++;
        if (PHYSICAL_ITEMS.some(p => name.includes(p))) physCount++;
      }

      let currentBuild: 'magical' | 'physical' | 'none' = 'none';
      if (magCount > physCount) currentBuild = 'magical';
      else if (physCount > magCount) currentBuild = 'physical';

      if (currentBuild !== 'none' && currentBuild !== this.detectedBuildType) {
        this.detectedBuildType = currentBuild;
        this.voice.speakNow(`${currentBuild.charAt(0).toUpperCase() + currentBuild.slice(1)} build path detected. Prioritizing matching item timings.`);
      }
    }

    recommendations.push(...this.generalRoleRules(snapshot));

    recommendations.push(...this.creepScoreCheckpoints(snapshot));

    recommendations.push(...this.proItemTimingAdvice(snapshot));

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
  }

  // =========================================================================
  // General Role-Aware Rules
  // =========================================================================

  private generalRoleRules(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;
    const isSupport = snap.role === 'pos4' || snap.role === 'pos5';

    // --- Rune reminders (all roles) ---
    const nextRuneTime = this.getNextRuneTime(t);
    if (nextRuneTime !== null) {
      const timeUntilRune = nextRuneTime - t;
      if (timeUntilRune > 0 && timeUntilRune <= 20 && nextRuneTime !== this.lastRumeReminder) {
        this.lastRumeReminder = nextRuneTime;
        const runeType = nextRuneTime < POWER_RUNE_START ? 'Water rune' : 'Power rune';
        const mins = Math.floor(nextRuneTime / 60);
        const secs = nextRuneTime % 60;
        recs.push({
          priority: 'high',
          category: 'rune',
          message: `${runeType} spawning at ${mins}:${secs.toString().padStart(2, '0')}. ${isSupport ? 'Secure it for your mid' : 'Move to rune now'}.`,
          cooldownKey: `rune_${nextRuneTime}`,
          cooldownSeconds: 60,
        });
      }
    }

    // --- Lotus Pool reminder ---
    const nextLotusTime = this.getNextLotusTime(t);
    if (nextLotusTime !== null) {
      const timeUntilLotus = nextLotusTime - t;
      if (timeUntilLotus > 0 && timeUntilLotus <= 20 && nextLotusTime !== this.lastLotusReminder) {
        this.lastLotusReminder = nextLotusTime;
        recs.push({
          priority: 'medium',
          category: 'lotus',
          message: `Lotus Pool respawning soon. Pick it up for mana.`,
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
          message: 'Daytime. Better vision. Look for opportunities.',
          cooldownKey: 'daynight',
          cooldownSeconds: 120,
        });
      } else {
        recs.push({
          priority: 'medium',
          category: 'timing',
          message: 'Nighttime. Reduced vision. Stay safe.',
          cooldownKey: 'daynight',
          cooldownSeconds: 120,
        });
      }
    }
    if (this.lastDaytime === null) this.lastDaytime = snap.isDaytime;

    // --- Phase transitions (role-aware) ---
    if (snap.phase !== this.lastPhase && this.lastPhase !== '') {
      if (snap.phase === 'midgame') {
        recs.push({
          priority: 'high',
          category: 'rotation',
          message: isSupport
            ? '10 minutes. Laning phase over. Stack camps, place deep wards, and look for smoke ganks.'
            : '10 minutes. Laning phase is over. Start looking for rotations and objectives.',
          cooldownKey: 'phase_midgame',
          cooldownSeconds: 300,
        });
      } else if (snap.phase === 'lategame') {
        recs.push({
          priority: 'high',
          category: 'rotation',
          message: isSupport
            ? '25 minutes. Late game. Stick with your cores, save your spells for fights, and maintain vision.'
            : '25 minutes. Late game. Group with your team for key fights. Watch your positioning.',
          cooldownKey: 'phase_lategame',
          cooldownSeconds: 300,
        });
      }
    }
    this.lastPhase = snap.phase;

    // --- Death tracking (role-aware) ---
    if (snap.player.deaths > this.deathCount) {
      this.deathCount = snap.player.deaths;
      const mins = Math.floor(t / 60);
      if (this.deathCount <= LANING_DEATH_THRESHOLD && mins < LANING_DEATH_MIN_TIME) {
        recs.push({
          priority: 'high',
          category: 'death',
          message: `You died at ${mins} minutes. ${this.deathCount} deaths in laning. ${isSupport ? 'Watch your positioning and keep your distance.' : 'Be more careful with positioning.'}`,
          cooldownKey: `death_${this.deathCount}`,
          cooldownSeconds: 30,
        });
      } else if (this.deathCount >= MANY_DEATHS_THRESHOLD) {
        recs.push({
          priority: 'critical',
          category: 'death',
          message: `${this.deathCount} deaths. ${isSupport ? 'Stop feeding. Play safer, stay behind cores, and buy defensive items.' : 'Focus on farming safely and avoid solo plays until you have a key item.'}`,
          cooldownKey: 'death_many',
          cooldownSeconds: 60,
        });
      }
    }

    // --- Low HP warning ---
    if (snap.hero.alive && snap.hero.healthPercent > 0 && snap.hero.healthPercent < LOW_HP_THRESHOLD) {
      recs.push({
        priority: 'high',
        category: 'positioning',
        message: isSupport ? 'Low health. Back off and heal up. Your life matters for saving cores.' : 'Low health. Back off or use a salve.',
        cooldownKey: 'low_hp',
        cooldownSeconds: 15,
      });
    }

    // --- Low mana warning ---
    if (snap.hero.alive && snap.hero.manaPercent > 0 && snap.hero.manaPercent < LOW_MANA_THRESHOLD && snap.hero.level >= LOW_MANA_MIN_LEVEL) {
      recs.push({
        priority: 'medium',
        category: 'mana',
        message: isSupport ? 'Low mana. Use clarity or shrine. Your spells are critical for fights.' : 'Low mana. Use bottle or clarity.',
        cooldownKey: 'low_mana',
        cooldownSeconds: 20,
      });
    }

    // --- Last hits benchmark (core roles) ---
    if (!isSupport && snap.phase === 'laning' && t > 0) {
      const mins = t / 60;
      const lhPerMin = snap.player.lastHits / Math.max(mins, 1);
      if (mins >= LH_BENCHMARK_MIN_MINUTES && lhPerMin < LH_PER_MIN_TARGET) {
        recs.push({
          priority: 'medium',
          category: 'farming',
          message: `Your last hits are low. ${snap.player.lastHits} in ${Math.floor(mins)} minutes. Focus on getting every creep.`,
          cooldownKey: 'lh_low',
          cooldownSeconds: 120,
        });
      }
    }

    const midTowers = snap.buildings.filter(b =>
      b.name.includes('mid') && b.name.includes('tower') &&
      b.health > 0 && b.health < b.maxHealth * TOWER_LOW_HEALTH_RATIO
    );
    for (const tower of midTowers) {
      recs.push({
        priority: 'high',
        category: 'positioning',
        message: `${tower.team} mid tower is low. ${isSupport ? 'Help defend or ward near it.' : tower.team === 'radiant' ? 'Defend it.' : 'Push it down.'}`,
        cooldownKey: `tower_${tower.name}`,
        cooldownSeconds: 60,
      });
    }

    // === Support-specific rules ===
    if (isSupport) {
      const isPos5 = snap.role === 'pos5';

      // Ward check — remind to place if carrying wards
      const hasObs = snap.items.some(i => i.itemName.includes('ward_observer') || i.itemName.includes('ward_dispenser'));
      const hasSentries = snap.items.some(i => i.itemName.includes('ward_sentry') || i.itemName.includes('ward_true_sight'));
      if (hasObs && t > 60) {
        recs.push({
          priority: 'medium',
          category: 'warding',
          message: 'You have observer wards. Place them for vision — cliff ward, jungle entrance, or near the next objective.',
          cooldownKey: 'place_obs',
          cooldownSeconds: 120,
        });
      }
      if (hasSentries && t > 60) {
        recs.push({
          priority: 'low',
          category: 'warding',
          message: 'You have sentry wards. De-ward known enemy observer spots or block camps.',
          cooldownKey: 'place_sentry',
          cooldownSeconds: 180,
        });
      }

      // Stack reminder at :53-:55 when in laning phase
      if (snap.phase === 'laning' && t > 60) {
        const secInMinute = t % 60;
        if (secInMinute >= 53 && secInMinute <= 56) {
          recs.push({
            priority: 'medium',
            category: 'stacking',
            message: 'Stack a camp now. Pull the creep wave at :15 or :45 for your carry.',
            cooldownKey: `stack_${Math.floor(t / 60)}`,
            cooldownSeconds: 55,
          });
        }
      }

      // Save ability check — remind if a save/peel ability is off cooldown
      const saveAbilityNames = isPos5
        ? ['cold_feet', 'frost_shield', 'chakram', 'maledict', 'heal', 'shallow_grave', 'shadow_wave', 'purification', 'fortitude']
        : ['telekinesis', 'earth_spike', 'hex', 'impale', 'vendetta', 'bushwhack', 'ice_shards', 'spirits', 'fire_spirits'];
      for (const ability of snap.abilities) {
        const abilLower = ability.abilityName.toLowerCase();
        const isSave = saveAbilityNames.some(s => abilLower.includes(s));
        if (isSave && !ability.passive && ability.canCast && ability.cooldown === 0 && snap.hero.alive) {
          recs.push({
            priority: 'high',
            category: 'save',
            message: `${ability.abilityName.replace('item_', '')} is ready. Save it for a critical moment — peel for your core or interrupt the enemy.`,
            cooldownKey: `save_${ability.abilityName}`,
            cooldownSeconds: 60,
          });
          break;
        }
      }

      // No farm pressure reminder for supports
      if (snap.player.lastHits > 20 && t < 600) {
        recs.push({
          priority: 'low',
          category: 'farming',
          message: 'You have a lot of last hits for a support. Let your cores farm — stack and pull instead.',
          cooldownKey: 'support_no_farm',
          cooldownSeconds: 120,
        });
      }

      // Smoke reminder post-laning
      if (snap.phase !== 'laning' && t > 900) {
        const hasSmoke = snap.items.some(i => i.itemName.includes('smoke'));
        if (!hasSmoke) {
          recs.push({
            priority: 'medium',
            category: 'item',
            message: 'Consider buying smoke for a pick-off or team gank.',
            cooldownKey: 'smoke_reminder',
            cooldownSeconds: 180,
          });
        }
      }
    }

    return recs;
  }

  private proItemTimingAdvice(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const profile = snap.stratzContext.proProfile;
    if (!profile || profile.itemTimings.length === 0) return recs;

    const t = snap.clockTime;

    if (this.lastItemAdviceClockTime !== -999 && t - this.lastItemAdviceClockTime < ITEM_ADVICE_COOLDOWN) {
      return recs;
    }

    const playerItems = new Set(snap.items.map(i => i.itemName.toLowerCase()));

    for (const timing of profile.itemTimings) {
      const adviceKey = `pro_item_${timing.itemId}`;

      if (this.proItemsAdvised.has(adviceKey)) continue;

      if (timing.purchaseRate < 0.3) continue;

      const itemNameLower = timing.itemName.toLowerCase()
        .replace(/'/g, '')
        .replace(/\s+/g, '_');

      if (this.detectedBuildType === 'magical') {
        if (PHYSICAL_ITEMS.some(p => itemNameLower.includes(p))) {
          continue;
        }
      } else if (this.detectedBuildType === 'physical') {
        if (MAGICAL_ITEMS.some(m => itemNameLower.includes(m))) {
          continue;
        }
      }

      const hasItem = playerItems.has(itemNameLower) ||
        snap.items.some(i => i.itemName.toLowerCase().includes(itemNameLower.split('_')[0]));
      if (hasItem) {
        this.proItemsAdvised.add(adviceKey);
        continue;
      }

      const timingDiff = t - timing.medianTime;

      if (timingDiff > ITEM_BEHIND_WINDOW_START && timingDiff < ITEM_BEHIND_WINDOW_END) {
        const proMins = Math.floor(timing.medianTime / 60);
        const proSecs = Math.floor(timing.medianTime % 60);
        this.proItemsAdvised.add(adviceKey);
        this.lastItemAdviceClockTime = t;

        recs.push({
          priority: 'medium',
          category: 'item',
          message: `Pro players usually have ${timing.itemName} by ${proMins}:${proSecs.toString().padStart(2, '0')}. You're behind on this timing. Focus on farming for it.`,
          cooldownKey: adviceKey,
          cooldownSeconds: 180,
        });
        break;
      }

      if (timingDiff >= -ITEM_WINDOW_LEAD && timingDiff <= ITEM_BEHIND_WINDOW_START) {
        this.proItemsAdvised.add(adviceKey);
        this.lastItemAdviceClockTime = t;

        recs.push({
          priority: 'high',
          category: 'item',
          message: `Item timing window: pro players get ${timing.itemName} around now. Make sure you're on track.`,
          cooldownKey: adviceKey,
          cooldownSeconds: 180,
        });
        break;
      }
    }

    if (profile.avgGPM > 0 && t > GPM_COMPARE_MIN_TIME) {
      const gpmRatio = snap.player.gpm / profile.avgGPM;
      if (gpmRatio < 0.7) {
        recs.push({
          priority: 'medium',
          category: 'farming',
          message: `Your GPM is ${snap.player.gpm}. Pro players average ${Math.round(profile.avgGPM)} on this hero. Farm more aggressively.`,
          cooldownKey: 'gpm_compare',
          cooldownSeconds: 180,
        });
      } else if (gpmRatio > 1.2) {
        recs.push({
          priority: 'low',
          category: 'farming',
          message: `Great farm. Your GPM is above pro average. Use your advantage to make plays.`,
          cooldownKey: 'gpm_ahead',
          cooldownSeconds: 300,
        });
      }
    }

    return recs;
  }

  private creepScoreCheckpoints(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    const checkpoints = [600, 1200, 1800];

    for (const cp of checkpoints) {
      if (t >= cp && t <= cp + 10 && !this.lhCheckpointsHit.has(cp)) {
        this.lhCheckpointsHit.add(cp);
        const mins = cp / 60;
        const playerLH = snap.player.lastHits;

        const profile = snap.stratzContext.proProfile;
        if (profile && profile.avgGPM > 0) {
          const proEstLH = Math.round((profile.avgGPM / 40) * mins);

          const diff = playerLH - proEstLH;
          if (diff >= 10) {
            recs.push({
              priority: 'low', category: 'farming',
              message: `${mins} minute mark: ${playerLH} last hits. You're ahead of pro pace. Great farming.`,
              cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
            });
          } else if (diff >= -10) {
            recs.push({
              priority: 'medium', category: 'farming',
              message: `${mins} minute mark: ${playerLH} last hits. On par with pro average pace. Keep it up.`,
              cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
            });
          } else {
            recs.push({
              priority: 'high', category: 'farming',
              message: `${mins} minute mark: ${playerLH} last hits. Pro players average around ${proEstLH} by now. You need to farm faster.`,
              cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
            });
          }
        } else {
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
    const runeIntervals: number[] = [];
    for (let t = WATER_RUNE_INTERVAL; t < POWER_RUNE_START; t += WATER_RUNE_INTERVAL) {
      runeIntervals.push(t);
    }
    for (let t = POWER_RUNE_START; t <= MAX_RUNE_TIME; t += POWER_RUNE_INTERVAL) {
      runeIntervals.push(t);
    }

    for (const t of runeIntervals) {
      if (t > currentTime) return t;
    }
    return null;
  }

  private getNextLotusTime(currentTime: number): number | null {
    for (let t = LOTUS_START; t <= MAX_RUNE_TIME; t += LOTUS_INTERVAL) {
      if (t > currentTime) return t;
    }
    return null;
  }
}
