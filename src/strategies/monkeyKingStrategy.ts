// ============================================================================
// GankMeDaddy — Monkey King Strategy (Hero ID: 114)
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const monkeyKingStrategy: HeroStrategy = {
  heroId: 114,
  heroName: 'Monkey King',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];

    if (snap.hero.level >= 2 && snap.phase === 'laning') {
      recs.push({
        priority: 'medium', category: 'aggression',
        message: 'Trade hits aggressively. Jingu Mastery gives lifesteal and bonus damage at 4 hits.',
        cooldownKey: 'mk_jingu', cooldownSeconds: 120,
      });
    }

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'high', category: 'power_spike',
        message: 'Level 6. Wukongs Command is online. Fight in chokepoints for max impact.',
        cooldownKey: 'mk_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.healthPercent < 30 && snap.hero.alive) {
      recs.push({
        priority: 'critical', category: 'positioning',
        message: 'Low HP. Jump to a tree or disengage. MK is squishy without Jingu lifesteal.',
        cooldownKey: 'mk_low_hp', cooldownSeconds: 15,
      });
    }

    if (snap.hero.manaPercent > 50 && snap.phase === 'laning') {
      const boundless = snap.abilities.find(a => a.abilityName.includes('boundless_strike') && a.level > 0);
      if (boundless?.canCast) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Boundless Strike crits and stuns. Use it to win trades.',
          cooldownKey: 'mk_boundless', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'midgame' && snap.hero.level >= 12) {
      const hasBkb = snap.items.some(i => i.itemName.includes('black_king_bar'));
      if (!hasBkb) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'BKB lets you channel Wukongs Command uninterrupted. Essential.',
          cooldownKey: 'mk_bkb', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
