import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const spectreStrategy: HeroStrategy = {
  heroId: 67,
  heroName: 'Spectre',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Haunt online. Global presence — ult into any fight to clean up low-HP enemies.',
        cooldownKey: 'spec_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive) {
      const haunt = snap.abilities.find(a => a.abilityName.includes('haunt') && a.canCast);
      if (haunt) {
        recs.push({
          priority: 'high', category: 'rotation',
          message: 'Haunt ready. If a fight breaks out anywhere, Reality in and pick off a squishy support.',
          cooldownKey: 'spec_haunt', cooldownSeconds: 60,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 25) {
      const dagger = snap.abilities.find(a => a.abilityName.includes('spectral_dagger') && a.canCast);
      if (dagger) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Spectral Dagger ready. Throw it through creeps and the offlaner for free damage and chase.',
          cooldownKey: 'spec_dagger', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const hasRadiance = snap.items.some(i => i.itemName.includes('radiance'));
      if (!hasRadiance && t > 900) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Radiance is Spectre\'s core timng item. It accelerates your farm and burn enemies during Haunt.',
          cooldownKey: 'spec_rad', cooldownSeconds: 180,
        });
      }
    }

    if (snap.player.gpm < 450 && t > 600) {
      recs.push({
        priority: 'medium', category: 'farming',
        message: 'Your farm is low on Spectre. Focus on last hits and jungle stacks — you need items to come online.',
        cooldownKey: 'spec_farm', cooldownSeconds: 120,
      });
    }

    return recs;
  },
};
