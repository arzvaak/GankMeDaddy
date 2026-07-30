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
    const role = snap.role;
    const isSupport = role === 'pos4' || role === 'pos5';
    const isAlive = snap.hero.alive;
    const healingInBase = this.isInBase(snap);

    // --- Rune reminders (role & lane specific) ---
    const nextRuneTime = this.getNextRuneTime(t);
    if (nextRuneTime !== null && isAlive) {
      const timeUntilRune = nextRuneTime - t;
      if (timeUntilRune > 0 && timeUntilRune <= 20 && nextRuneTime !== this.lastRumeReminder) {
        this.lastRumeReminder = nextRuneTime;
        const runeType = nextRuneTime < POWER_RUNE_START ? 'Water rune' : 'Power rune';
        const mins = Math.floor(nextRuneTime / 60);
        const secs = nextRuneTime % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        let message = '';
        if (role === 'mid') {
          if (runeType === 'Water rune') {
            message = `Water rune spawning at ${timeStr}. Consider pushing your creep wave under the enemy tower now so you can secure it to refill your bottle.`;
          } else {
            message = `Power rune spawning at ${timeStr}. Try pushing the lane so you can contest it or rotate to make plays with a good active rune.`;
          }
        } else if (role === 'pos4') {
          message = `${runeType} spawning at ${timeStr}. Consider roaming to mid-lane to help secure it, as a power rune control can dictate mid game momentum.`;
        } else if (role === 'pos5') {
          message = `${runeType} spawning at ${timeStr}. Check nearby runes, or prioritize bounty and wisdom runes to help your team scale.`;
        } else if (role === 'pos3') {
          message = `${runeType} spawning at ${timeStr}. Try contesting the enemy supports to starve their carry of gold and map control.`;
        } else { // pos1
          message = `Bounty and Wisdom runes spawning at ${timeStr}. Focus on securing safe lane farm while your supports contest.`;
        }

        recs.push({
          priority: 'high',
          category: 'rune',
          message,
          cooldownKey: `rune_${nextRuneTime}`,
          cooldownSeconds: 60,
        });
      }
    }

    // --- Lotus Pool reminder (role & lane specific) ---
    const nextLotusTime = this.getNextLotusTime(t);
    if (nextLotusTime !== null && isAlive) {
      const timeUntilLotus = nextLotusTime - t;
      if (timeUntilLotus > 0 && timeUntilLotus <= 20 && nextLotusTime !== this.lastLotusReminder) {
        this.lastLotusReminder = nextLotusTime;
        let message = '';
        if (role === 'pos1') {
          message = 'Lotus pool is active. Try to secure it for critical lane health and mana sustain so you can stay in lane longer.';
        } else if (role === 'pos3') {
          message = 'Lotus pool is active soon. Consider contesting it to deny the enemy safelaner healing resources.';
        } else if (role === 'pos4' || role === 'pos5') {
          message = 'Lotus pool is active soon. Try to secure the lotus fruit to replenish your lane core\'s resources.';
        } else { // mid
          message = 'Lotus pool is active in side lanes. Consider grabbing a lotus if rotating to replenish your mana pool.';
        }

        recs.push({
          priority: 'medium',
          category: 'lotus',
          message,
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
          message: 'Daytime is here. Vision is expanded. Look to set up aggressive plays or establish map control.',
          cooldownKey: 'daynight',
          cooldownSeconds: 120,
        });
      } else {
        recs.push({
          priority: 'medium',
          category: 'timing',
          message: 'Nighttime is here. Vision is reduced. Play more cautiously as gank risks are higher.',
          cooldownKey: 'daynight',
          cooldownSeconds: 120,
        });
      }
    }
    if (this.lastDaytime === null) this.lastDaytime = snap.isDaytime;

    // --- Phase transitions (role & lane specific) ---
    if (snap.phase !== this.lastPhase && this.lastPhase !== '') {
      if (snap.phase === 'midgame') {
        let message = '';
        switch (role) {
          case 'pos1':
            message = '10 minutes. Laning is wrapping up. Consider transitioning to the jungle or triangle farm to scale safely and avoid ganks.';
            break;
          case 'mid':
            message = '10 minutes. Laning is wrapping up. Active playmaking starts: grab a smoke, rotate to side lanes, and pressure enemy towers to create space.';
            break;
          case 'pos3':
            message = '10 minutes. Laning phase is ending. Consider pushing the enemy safelane tower to take control of their jungle and create space.';
            break;
          case 'pos4':
            message = '10 minutes. Laning is wrapping up. Look to coordinate smoke ganks with mid or offlane and set up offensive vision.';
            break;
          case 'pos5':
            message = '10 minutes. Laning is wrapping up. Stack jungle camps and ward choke points to protect your carry as they transition to farm.';
            break;
        }
        recs.push({
          priority: 'high',
          category: 'rotation',
          message,
          cooldownKey: 'phase_midgame',
          cooldownSeconds: 300,
        });
      } else if (snap.phase === 'lategame') {
        let message = '';
        switch (role) {
          case 'pos1':
            message = '25 minutes. Late game transition. Avoid getting caught without buyback, and coordinate with your team around Roshan to secure the Aegis.';
            break;
          case 'mid':
            message = '25 minutes. Late game transition. Target prioritization is key. Look to jump the backline supports and squishy cores in fights.';
            break;
          case 'pos3':
            message = '25 minutes. Late game transition. Position as the frontline shield and look for initiation windows on priority targets.';
            break;
          case 'pos4':
            message = '25 minutes. Late game transition. Stay hidden to execute counter-initiations and maintain vision around key objectives.';
            break;
          case 'pos5':
            message = '25 minutes. Late game transition. Stay positioned behind your cores to execute defensive saves and keep buyback ready.';
            break;
        }
        recs.push({
          priority: 'high',
          category: 'rotation',
          message,
          cooldownKey: 'phase_lategame',
          cooldownSeconds: 300,
        });
      }
    }
    this.lastPhase = snap.phase;

    // --- Death tracking (role & lane specific) ---
    if (snap.player.deaths > this.deathCount) {
      this.deathCount = snap.player.deaths;
      const mins = Math.floor(t / 60);
      if (this.deathCount <= LANING_DEATH_THRESHOLD && mins < LANING_DEATH_MIN_TIME) {
        let message = '';
        switch (role) {
          case 'pos1':
            message = `You died at ${mins} minutes, which slows your item timings. Consider playing defensively near your tower and ask supports to stack.`;
            break;
          case 'mid':
            message = `You died at ${mins} minutes, giving the enemy mid momentum. Control creep aggression and watch your highground positioning.`;
            break;
          case 'pos3':
            message = `You died at ${mins} minutes. Try pulling the wave or holding it near your tower to avoid giving the enemy carry free farm.`;
            break;
          case 'pos4':
            message = `You died at ${mins} minutes. Focus on trading efficiently from trees to make space rather than risking your life.`;
            break;
          case 'pos5':
            message = `You died at ${mins} minutes. Watch your positioning in lane; trade from safety to preserve your carry's presence.`;
            break;
        }
        recs.push({
          priority: 'high',
          category: 'death',
          message,
          cooldownKey: `death_${this.deathCount}`,
          cooldownSeconds: 30,
        });
      } else if (this.deathCount >= MANY_DEATHS_THRESHOLD) {
        let message = '';
        switch (role) {
          case 'pos1':
            message = `${this.deathCount} deaths. Focus on staying off the map, farming the safe triangle, and dodging fights until you recover.`;
            break;
          case 'mid':
            message = `${this.deathCount} deaths. Stick behind your offlane initiator and avoid solo plays until you stabilize.`;
            break;
          case 'pos3':
            message = `${this.deathCount} deaths. Shift toward aura items and play for team counter-initiations rather than deep plays.`;
            break;
          case 'pos4':
            message = `${this.deathCount} deaths. Stick to warding safe entry points and play defensively behind trees.`;
            break;
          case 'pos5':
            message = `${this.deathCount} deaths. Prioritize defensive saves and stay positioned behind your cores to avoid feeding.`;
            break;
        }
        recs.push({
          priority: 'critical',
          category: 'death',
          message,
          cooldownKey: 'death_many',
          cooldownSeconds: 60,
        });
      }
    }

    // --- Low HP warning (role specific) ---
    if (isAlive && !healingInBase && snap.hero.healthPercent > 0 && snap.hero.healthPercent < LOW_HP_THRESHOLD) {
      let message = '';
      switch (role) {
        case 'pos1':
          message = 'Low health. Consider backing off to your tower, using a salve, or retreating to the jungle to avoid giving away kill bounty.';
          break;
        case 'mid':
          message = 'Low health. Consider backing off to bottle a rune or returning to base, as contesting the mid lane with low HP is high risk.';
          break;
        case 'pos3':
          message = 'Low health. Retreat to tower or use regen. You need to stay healthy to maintain lane pressure.';
          break;
        case 'pos4':
        case 'pos5':
          message = 'Low health. Keep your distance, stay in the backlines, and heal up to support your cores.';
          break;
      }
      recs.push({
        priority: 'high',
        category: 'positioning',
        message,
        cooldownKey: 'low_hp',
        cooldownSeconds: 15,
      });
    }

    // --- Low mana warning (role specific) ---
    if (isAlive && !healingInBase && snap.hero.manaPercent > 0 && snap.hero.manaPercent < LOW_MANA_THRESHOLD && snap.hero.level >= LOW_MANA_MIN_LEVEL) {
      let message = '';
      switch (role) {
        case 'pos1':
          message = 'Low mana. Use a clarity or shrine so you have enough mana for farming spells or escape abilities.';
          break;
        case 'mid':
          message = 'Low mana. Bottle a rune or ferry a clarity, as you need mana to threaten the lane and secure creeps.';
          break;
        case 'pos3':
          message = 'Low mana. Ferry a clarity so you have mana to cast your stun or crowd control abilities.';
          break;
        case 'pos4':
        case 'pos5':
          message = 'Low mana. Use a clarity or shrine. Your spells are critical to peel for your core or secure kills.';
          break;
      }
      recs.push({
        priority: 'medium',
        category: 'mana',
        message,
        cooldownKey: 'low_mana',
        cooldownSeconds: 20,
      });
    }

    // --- Last hits benchmark (core roles - role specific) ---
    if (!isSupport && snap.phase === 'laning' && t > 0) {
      const mins = t / 60;
      const lhPerMin = snap.player.lastHits / Math.max(mins, 1);
      if (mins >= LH_BENCHMARK_MIN_MINUTES && lhPerMin < LH_PER_MIN_TARGET) {
        let message = '';
        if (role === 'pos1') {
          message = `Your last hits are low for a Carry: ${snap.player.lastHits} in ${Math.floor(mins)} minutes. Consider playing closer to your tower and requesting support pulls to farm safely.`;
        } else if (role === 'mid') {
          message = `Your last hits are low for Mid: ${snap.player.lastHits} in ${Math.floor(mins)} minutes. Try focusing on creep equilibrium and secure denies to recover.`;
        } else { // pos3
          message = `Your last hits are low: ${snap.player.lastHits} in ${Math.floor(mins)} minutes. Try securing the wave or pulling the hard camp to reset the lane.`;
        }
        recs.push({
          priority: 'medium',
          category: 'farming',
          message,
          cooldownKey: 'lh_low',
          cooldownSeconds: 120,
        });
      }
    }

    const playerTeam = snap.player.team || 'radiant';
    const midTowers = snap.buildings.filter(b =>
      b.name.includes('mid') && b.name.includes('tower') &&
      b.health > 0 && b.health < b.maxHealth * TOWER_LOW_HEALTH_RATIO
    );
    for (const tower of midTowers) {
      const isFriendly = tower.team === playerTeam;
      let message = '';
      if (isFriendly) {
        message = `Your mid tower is low. ${isSupport ? 'Consider defending it or placing defensive wards nearby to secure your map area.' : 'Try to defend it to maintain mid lane control.'}`;
      } else {
        message = `The enemy mid tower is low. ${isSupport ? 'Consider warding their jungle to secure map pressure around it.' : 'Try to pressure and push it down to open up the map.'}`;
      }
      recs.push({
        priority: 'high',
        category: 'positioning',
        message,
        cooldownKey: `tower_${tower.name}`,
        cooldownSeconds: 60,
      });
    }

    // === Support-specific rules ===
    if (isSupport) {
      const isPos5 = role === 'pos5';

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
          message: `Pro players usually secure ${timing.itemName} by ${proMins}:${proSecs.toString().padStart(2, '0')} to enable their next power spike. Consider prioritizing safe farm and avoiding high-risk fights to finish it.`,
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
          message: `Pro players typically acquire ${timing.itemName} around this time. Getting this will expand your map pressure and combat capability.`,
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
          message: `Your GPM is ${snap.player.gpm}, compared to the pro average of ${Math.round(profile.avgGPM)}. Consider clearing jungle camps between waves to speed up your progression.`,
          cooldownKey: 'gpm_compare',
          cooldownSeconds: 180,
        });
      } else if (gpmRatio > 1.2) {
        recs.push({
          priority: 'low',
          category: 'farming',
          message: `Excellent GPM of ${snap.player.gpm}, exceeding the pro average of ${Math.round(profile.avgGPM)}. Try to leverage this gold advantage to secure objectives and press map control.`,
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
              message: `${mins} minute mark: ${playerLH} last hits, which is ahead of the pro benchmark of ${proEstLH}. Excellent job maximizing farm.`,
              cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
            });
          } else if (diff >= -10) {
            recs.push({
              priority: 'medium', category: 'farming',
              message: `${mins} minute mark: ${playerLH} last hits, matching the pro benchmark of ${proEstLH}. Keep maintaining this pace.`,
              cooldownKey: `lh_cp_${cp}`, cooldownSeconds: 300,
            });
          } else {
            recs.push({
              priority: 'high', category: 'farming',
              message: `${mins} minute mark: ${playerLH} last hits, which is behind the pro average of ${proEstLH}. Consider clearing jungle stacks or lane waves to pick up the speed.`,
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

  private isInBase(snap: MatchSnapshot): boolean {
    const x = snap.hero.xpos;
    const y = snap.hero.ypos;
    const team = snap.player.team || 'radiant';
    if (team === 'radiant') {
      return x < -5500 && y < -5500;
    } else {
      return x > 5500 && y > 5500;
    }
  }
}
