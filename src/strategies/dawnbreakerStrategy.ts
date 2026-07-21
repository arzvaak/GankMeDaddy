import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const dawnbreakerStrategy: HeroStrategy = {
  heroId: 135,
  heroName: 'Dawnbreaker',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Global Presence online. You can TP to any fight and save allies globally.',
        cooldownKey: 'db_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive) {
      const global = snap.abilities.find(a => a.abilityName.includes('global_presence') && a.canCast);
      if (global) {
        recs.push({
          priority: 'high', category: 'rotation',
          message: 'Global Presence ready. Look at the minimap — if a fight is breaking out, TP in with your hammer.',
          cooldownKey: 'db_global', cooldownSeconds: 60,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const hammer = snap.abilities.find(a => a.abilityName.includes('celestial_hammer') && a.canCast);
      if (hammer) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Celestial Hammer ready. Throw it, then dive in to stun and harass the offlaner.',
          cooldownKey: 'db_hammer', cooldownSeconds: 20,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 50 && snap.hero.healthPercent > 0) {
      const heal = snap.abilities.find(a => a.abilityName.includes('luminosity') && a.canCast);
      if (heal) {
        recs.push({
          priority: 'medium', category: 'save',
          message: 'Luminosity ready. Hit enemies to trigger the heal — it affects you and nearby allies.',
          cooldownKey: 'db_heal', cooldownSeconds: 15,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const echoSabre = snap.items.some(i => i.itemName.includes('echo_sabre'));
      if (!echoSabre && snap.player.gold > 2000) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Echo Sabre gives Dawnbreaker double hits for Luminosity procs. Great farming and fighting item.',
          cooldownKey: 'db_echo', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
