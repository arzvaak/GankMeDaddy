import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const warlockStrategy: HeroStrategy = {
  heroId: 37,
  heroName: 'Warlock',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Chaotic Offering is online. Golem provides huge push and teamfight power.',
        cooldownKey: 'wl_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 60) {
      const golem = snap.abilities.find(a => a.abilityName.includes('chaotic_offering') || a.abilityName.includes('golem'));
      const bonds = snap.abilities.find(a => a.abilityName.includes('fatal_bonds') && a.canCast);
      if (golem && golem.canCast && bonds) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Fatal Bonds then Golem combo ready. Bonds multiple enemies before dropping the Golem for massive damage.',
          cooldownKey: 'wl_combo', cooldownSeconds: 120,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 40) {
      recs.push({
        priority: 'medium', category: 'aggression',
        message: 'Shadow Word ready. Use it to trade effectively — heal yourself, damage the enemy.',
        cooldownKey: 'wl_heal', cooldownSeconds: 25,
      });
    }

    if (snap.phase !== 'laning' && snap.hero.level >= 12) {
      const refresher = snap.items.some(i => i.itemName.includes('refresher'));
      if (!refresher && snap.player.gold > 4500) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Refresher Orb on Warlock is game-winning. Double Golem wins late-game fights.',
          cooldownKey: 'wl_refresher', cooldownSeconds: 300,
        });
      }
      const hasAghs = snap.items.some(i => i.itemName.includes('aghanims'));
      if (!hasAghs && snap.player.gold > 3500) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Aghanim\'s Scepter upgrades Golem with a deadly area slow and damage aura.',
          cooldownKey: 'wl_aghs', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
