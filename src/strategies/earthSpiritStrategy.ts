import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const earthSpiritStrategy: HeroStrategy = {
  heroId: 107,
  heroName: 'Earth Spirit',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Magnetize online. Rolling Boulder into Magnetize is a deadly roaming combo.',
        cooldownKey: 'es_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 50) {
      const magnetize = snap.abilities.find(a => a.abilityName.includes('magnetize') && a.canCast);
      const boulder = snap.abilities.find(a => a.abilityName.includes('rolling_boulder') && a.canCast);
      if (magnetize && boulder) {
        recs.push({
          priority: 'high', category: 'rotation',
          message: 'Rolling Boulder and Magnetize ready. Roll in, kick a remnant, Magnetize for massive damage over time.',
          cooldownKey: 'es_roam', cooldownSeconds: 60,
        });
      }
    }

    if (snap.hero.alive && snap.hero.manaPercent > 30) {
      const grip = snap.abilities.find(a => a.abilityName.includes('geomagnetic_grip') && a.canCast);
      if (grip) {
        recs.push({
          priority: 'medium', category: 'save',
          message: 'Geomagnetic Grip ready. Pull an ally to safety or silence an enemy.',
          cooldownKey: 'es_grip', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 40) {
      const boulder = snap.abilities.find(a => a.abilityName.includes('rolling_boulder') && a.canCast);
      if (boulder) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Rolling Boulder ready. Charge it up and roll into the enemy for a guaranteed silence.',
          cooldownKey: 'es_boulder', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase !== 'laning') {
      const hasShard = snap.items.some(i => i.itemName.includes('shard'));
      if (!hasShard && t > 1200) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Aghanim\'s Shard gives Earth Spirit a second charge on Rolling Boulder. Great mobility upgrade.',
          cooldownKey: 'es_shard', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
