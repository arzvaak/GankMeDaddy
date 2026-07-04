// ============================================================================
// GankMeDaddy — Shadow Fiend Strategy (Hero ID: 11)
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const shadowFiendStrategy: HeroStrategy = {
  heroId: 11,
  heroName: 'Shadow Fiend',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    // --- Early game soul priority ---
    if (snap.phase === 'laning' && snap.hero.level <= 3 && t < 180) {
      recs.push({
        priority: 'high',
        category: 'farming',
        message: 'Prioritize every last hit. Shadow Fiend needs souls to deal damage. Missing CS early is catastrophic.',
        cooldownKey: 'sf_souls_early',
        cooldownSeconds: 120,
      });
    }

    // --- Raze stack aggression ---
    if (snap.hero.level >= 3) {
      const razeAbilities = snap.abilities.filter(a =>
        a.abilityName.includes('shadowraze') && a.level > 0
      );
      const allRazesReady = razeAbilities.length >= 2 &&
        razeAbilities.every(a => a.canCast);
      if (allRazesReady && snap.hero.manaPercent > 40) {
        recs.push({
          priority: 'medium',
          category: 'aggression',
          message: 'All Razes ready. If the enemy is in range, triple Raze for massive damage.',
          cooldownKey: 'sf_raze_combo',
          cooldownSeconds: 20,
        });
      }
    }

    // --- Level 6 Requiem threat ---
    if (snap.hero.level === 6) {
      recs.push({
        priority: 'high',
        category: 'power_spike',
        message: 'Level 6. Requiem of Souls is available. Look for opportunities to set up solo kills.',
        cooldownKey: 'sf_lvl6',
        cooldownSeconds: 300,
      });
    }

    // --- Eul's Scepter combo timing ---
    if (snap.hero.level >= 6) {
      const hasEuls = snap.items.some(i => i.itemName.includes('cyclone'));
      const requiem = snap.abilities.find(a =>
        a.abilityName.includes('requiem') && a.level > 0
      );
      if (hasEuls && requiem && requiem.canCast) {
        recs.push({
          priority: 'high',
          category: 'aggression',
          message: 'Euls combo ready. Euls an enemy, then channel Requiem under them for a kill.',
          cooldownKey: 'sf_euls_combo',
          cooldownSeconds: 30,
        });
      }
    }

    // --- Tower pressure with souls ---
    if (snap.phase === 'laning' && snap.hero.level >= 5 && t > 300) {
      recs.push({
        priority: 'medium',
        category: 'aggression',
        message: 'With full souls, SF hits towers hard. Pressure the enemy mid tower when the lane is pushed.',
        cooldownKey: 'sf_tower_pressure',
        cooldownSeconds: 180,
      });
    }

    // --- SF death is devastating (lose souls) ---
    if (snap.hero.alive && snap.hero.healthPercent < 35) {
      recs.push({
        priority: 'critical',
        category: 'positioning',
        message: 'Critical HP on Shadow Fiend. Dying costs you souls. Play safe and heal up.',
        cooldownKey: 'sf_low_hp',
        cooldownSeconds: 15,
      });
    }

    // --- BKB reminder for team fights ---
    if (snap.phase === 'midgame' && snap.hero.level >= 12) {
      const hasBkb = snap.items.some(i => i.itemName.includes('black_king_bar'));
      if (!hasBkb && snap.player.deaths >= 3) {
        recs.push({
          priority: 'high',
          category: 'item',
          message: 'You are dying too much. BKB is essential on Shadow Fiend for team fights.',
          cooldownKey: 'sf_bkb',
          cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
