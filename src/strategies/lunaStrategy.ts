import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const lunaStrategy: HeroStrategy = {
  heroId: 48,
  heroName: 'Luna',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Eclipse online. Ult during a teamfight to melt the enemy backline.',
        cooldownKey: 'luna_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 60) {
      const eclipse = snap.abilities.find(a => a.abilityName.includes('eclipse') && a.canCast);
      if (eclipse) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Eclipse ready. Cast Lucent Beam, then Eclipse to maximize beam count on a single target.',
          cooldownKey: 'luna_eclipse', cooldownSeconds: 90,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const beam = snap.abilities.find(a => a.abilityName.includes('lucent_beam') && a.canCast);
      if (beam) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Lucent Beam ready. Use it to harass the offlaner and secure ranged creep last hits.',
          cooldownKey: 'luna_beam', cooldownSeconds: 15,
        });
      }
    }

    if (snap.phase !== 'laning' && snap.player.lastHits < 100 && t > 600) {
      recs.push({
        priority: 'medium', category: 'farming',
        message: 'Luna farms fast with Moon Glaives. Stack camps and clear them — your GPM should be one of the highest.',
        cooldownKey: 'luna_glaives', cooldownSeconds: 120,
      });
    }

    if (snap.phase === 'midgame') {
      const hasDlance = snap.items.some(i => i.itemName.includes('dragon_lance'));
      const hasHuron = snap.items.some(i => i.itemName.includes('hurricane'));
      if (!hasDlance && !hasHuron && t > 600) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Dragon Lance gives Luna the attack range she needs. Upgrade to Hurricane Pike later for survivability.',
          cooldownKey: 'luna_dlance', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
