import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const facelessVoidStrategy: HeroStrategy = {
  heroId: 41,
  heroName: 'Faceless Void',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Chronosphere online. Coordinate with your team — trap 2+ enemies and win the fight.',
        cooldownKey: 'fv_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 50) {
      const chrono = snap.abilities.find(a => a.abilityName.includes('chronosphere') && a.canCast);
      if (chrono) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Chronosphere ready. Time Walk in, drop Chrono on key targets, and bash them down.',
          cooldownKey: 'fv_chrono', cooldownSeconds: 90,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const bash = snap.abilities.find(a => a.abilityName.includes('time_lock') && a.level > 0);
      if (bash) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Time Lock bash is your kill setup. Trade hits — bashes into Time Walk reset wins the lane.',
          cooldownKey: 'fv_bash', cooldownSeconds: 15,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 35 && snap.hero.healthPercent > 0) {
      const timeWalk = snap.abilities.find(a => a.abilityName.includes('time_walk') && a.canCast);
      if (timeWalk) {
        recs.push({
          priority: 'high', category: 'save',
          message: 'Time Walk ready. Use it to dodge projectiles and revert incoming damage.',
          cooldownKey: 'fv_timewalk', cooldownSeconds: 10,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const hasMoM = snap.items.some(i => i.itemName.includes('mask_of_madness'));
      if (!hasMoM && t > 600) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Mask of Madness gives Faceless Void farm speed and attack speed inside Chronosphere.',
          cooldownKey: 'fv_mom', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
