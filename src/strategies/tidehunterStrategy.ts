import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const tidehunterStrategy: HeroStrategy = {
  heroId: 29,
  heroName: 'Tidehunter',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Ravage online. The best teamfight stun in the game. Group up and fight.',
        cooldownKey: 'th_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 60) {
      const ravage = snap.abilities.find(a => a.abilityName.includes('ravage') && a.canCast);
      if (ravage) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Ravage ready. Blink in and ult — stun their whole team for an easy fight win.',
          cooldownKey: 'th_ravage', cooldownSeconds: 120,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const gush = snap.abilities.find(a => a.abilityName.includes('gush') && a.canCast);
      if (gush) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Gush ready. Slow and reduce armor for an easy kill on the offlaner.',
          cooldownKey: 'th_gush', cooldownSeconds: 20,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 40 && snap.hero.healthPercent > 0) {
      const anchor = snap.abilities.find(a => a.abilityName.includes('anchor_smash') && a.canCast);
      if (anchor) {
        recs.push({
          priority: 'medium', category: 'positioning',
          message: 'Use Anchor Smash to reduce enemy damage. It helps you survive and protects your team.',
          cooldownKey: 'th_anchor', cooldownSeconds: 15,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const hasBlink = snap.items.some(i => i.itemName.includes('blink'));
      if (!hasBlink && snap.player.gold > 1800) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Blink Dagger on Tidehunter is essential. Blink Ravage wins games.',
          cooldownKey: 'th_blink', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
