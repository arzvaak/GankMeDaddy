import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const lionStrategy: HeroStrategy = {
  heroId: 26,
  heroName: 'Lion',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Finger of Death online. You can oneshot a squishy hero. Look for a pick-off.',
        cooldownKey: 'lion_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 60) {
      const finger = snap.abilities.find(a => a.abilityName.includes('finger') && a.canCast);
      if (finger) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Finger of Death ready. Use Earth Spike into Hex into Finger for a guaranteed kill on a core.',
          cooldownKey: 'lion_finger', cooldownSeconds: 60,
        });
      }
    }

    if (snap.hero.alive) {
      const hex = snap.abilities.find(a => a.abilityName.includes('hex') && a.canCast);
      const spike = snap.abilities.find(a => a.abilityName.includes('earth_spike') && a.canCast);
      if (spike && hex) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Earth Spike and Hex ready. Spike first, then Hex to extend the disable chain.',
          cooldownKey: 'lion_combo', cooldownSeconds: 30,
        });
      }
    }

    if (snap.hero.alive && snap.hero.manaPercent < 30 && snap.hero.manaPercent > 0) {
      const manaDrain = snap.abilities.find(a => a.abilityName.includes('mana_drain') && a.level > 0);
      if (manaDrain) {
        recs.push({
          priority: 'medium', category: 'mana',
          message: 'Use Mana Drain on a neutral or enemy to refill your mana.',
          cooldownKey: 'lion_drain', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase !== 'laning' && snap.hero.level >= 12) {
      const hasAghs = snap.items.some(i => i.itemName.includes('aghanims'));
      if (!hasAghs && t > 1500) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Aghanim\'s Shard gives Finger of Death area damage. Consider it for teamfights.',
          cooldownKey: 'lion_shard', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
