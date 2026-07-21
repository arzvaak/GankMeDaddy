import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const tuskStrategy: HeroStrategy = {
  heroId: 100,
  heroName: 'Tusk',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Walrus Punch is online. Tag Team into Walrus Punch destroys squishy targets.',
        cooldownKey: 'tusk_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 50) {
      const punch = snap.abilities.find(a => a.abilityName.includes('walrus_punch') && a.canCast);
      const tagTeam = snap.abilities.find(a => a.abilityName.includes('tag_team') && a.canCast);
      if (punch && tagTeam) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Tag Team then Walrus Punch combo ready. Snowball in, Tag Team, punch for massive burst.',
          cooldownKey: 'tusk_burst', cooldownSeconds: 60,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 40 && snap.hero.healthPercent > 0) {
      const snowball = snap.abilities.find(a => a.abilityName.includes('snowball') && a.canCast);
      if (snowball) {
        recs.push({
          priority: 'high', category: 'save',
          message: 'Snowball ready. Use it to save a core by rolling them out of danger.',
          cooldownKey: 'tusk_save', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 40) {
      const shards = snap.abilities.find(a => a.abilityName.includes('ice_shards') && a.canCast);
      if (shards) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Ice Shards ready. Block the enemy\'s escape path and zone them for your core.',
          cooldownKey: 'tusk_shards', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'laning' && t > 120 && snap.hero.manaPercent > 60) {
      recs.push({
        priority: 'medium', category: 'rotation',
        message: 'Tusk is a strong roamer. Consider rotating mid with Snowball for a guaranteed kill.',
        cooldownKey: 'tusk_roam', cooldownSeconds: 60,
      });
    }

    return recs;
  },
};
