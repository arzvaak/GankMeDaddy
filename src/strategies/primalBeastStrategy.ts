import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const primalBeastStrategy: HeroStrategy = {
  heroId: 137,
  heroName: 'Primal Beast',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Pulverize online. Trample in and ult for massive AoE stun and damage.',
        cooldownKey: 'pb_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 50) {
      const pulverize = snap.abilities.find(a => a.abilityName.includes('pulverize') && a.canCast);
      if (pulverize) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Pulverize ready. Onslaught in, use Trample, then ult to lock down their entire team.',
          cooldownKey: 'pb_pulverize', cooldownSeconds: 90,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const onslaught = snap.abilities.find(a => a.abilityName.includes('onslaught') && a.canCast);
      if (onslaught) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Onslaught ready. Charge it up and ram the offlaner for high burst and a free stun.',
          cooldownKey: 'pb_onslaught', cooldownSeconds: 20,
        });
      }
    }

    if (snap.hero.alive && snap.hero.manaPercent > 20) {
      const trample = snap.abilities.find(a => a.abilityName.includes('trample') && a.canCast);
      if (trample) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Trample active. Use it while moving through the enemy team for constant damage and slow.',
          cooldownKey: 'pb_trample', cooldownSeconds: 15,
        });
      }
    }

    if (snap.phase !== 'laning') {
      const bkb = snap.items.some(i => i.itemName.includes('black_king_bar'));
      if (!bkb && t > 1200) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Black King Bar is essential on Primal Beast. You need spell immunity to stay in the middle of fights.',
          cooldownKey: 'pb_bkb', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
