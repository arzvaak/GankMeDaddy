import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const centaurStrategy: HeroStrategy = {
  heroId: 96,
  heroName: 'Centaur Warrunner',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Stampede online. Global movespeed for your team — initiate or save with it.',
        cooldownKey: 'cw_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 50) {
      const stampede = snap.abilities.find(a => a.abilityName.includes('stampede') && a.canCast);
      if (stampede) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Stampede ready. Pop it to initiate as a team or save a core from a bad position.',
          cooldownKey: 'cw_stampede', cooldownSeconds: 90,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const stomp = snap.abilities.find(a => a.abilityName.includes('hoof_stomp') && a.canCast);
      if (stomp) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Hoof Stomp ready. Stun the offlaner and land Double Edge for massive damage.',
          cooldownKey: 'cw_stomp', cooldownSeconds: 20,
        });
      }
    }

    if (snap.hero.healthPercent < 40 && snap.hero.healthPercent > 0 && snap.hero.alive) {
      const doubleEdge = snap.abilities.find(a => a.abilityName.includes('double_edge') && a.canCast);
      if (doubleEdge && snap.hero.healthPercent > 0) {
        recs.push({
          priority: 'medium', category: 'positioning',
          message: 'You\'re low HP — Double Edge deals self-damage. Be careful not to kill yourself with it.',
          cooldownKey: 'cw_double', cooldownSeconds: 15,
        });
      }
    }

    if (snap.phase !== 'laning') {
      const blademail = snap.items.some(i => i.itemName.includes('blade_mail'));
      if (!blademail && snap.player.gold > 1800) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Blade Mail works great with Centaur\'s high HP pool. Reflects damage during Stampede initiations.',
          cooldownKey: 'cw_blade', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
