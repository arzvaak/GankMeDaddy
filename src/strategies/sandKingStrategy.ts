import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const sandKingStrategy: HeroStrategy = {
  heroId: 16,
  heroName: 'Sand King',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Epicenter online. Sand Storm to channel Epicenter safely and devastate teamfights.',
        cooldownKey: 'sk_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 60) {
      const epicenter = snap.abilities.find(a => a.abilityName.includes('epicenter') && a.canCast);
      if (epicenter) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Epicenter ready. Blink in, Burrowstrike, then immediately Epicenter for maximum damage.',
          cooldownKey: 'sk_epi', cooldownSeconds: 120,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 40) {
      const stike = snap.abilities.find(a => a.abilityName.includes('burrowstrike') && a.canCast);
      if (stike) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Burrowstrike ready. Stun and stack Caustic Finale on the offlaner for big damage.',
          cooldownKey: 'sk_strike', cooldownSeconds: 20,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 45 && snap.hero.healthPercent > 0) {
      const sandStorm = snap.abilities.find(a => a.abilityName.includes('sand_storm') && a.level > 0);
      if (sandStorm && sandStorm.canCast) {
        recs.push({
          priority: 'high', category: 'positioning',
          message: 'Sand Storm ready. Use it to go invisible and escape danger or dodge projectiles.',
          cooldownKey: 'sk_sand', cooldownSeconds: 15,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const hasBlink = snap.items.some(i => i.itemName.includes('blink'));
      if (!hasBlink && snap.player.gold > 1800) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Blink Dagger is core — sets up Burrowstrike and Epicenter on multiple heroes.',
          cooldownKey: 'sk_blink', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
