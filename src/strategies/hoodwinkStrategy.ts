import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const hoodwinkStrategy: HeroStrategy = {
  heroId: 123,
  heroName: 'Hoodwink',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Sharpshooter online. Look for long-range pickoffs on squishy targets.',
        cooldownKey: 'hw_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive) {
      const sharpshooter = snap.abilities.find(a => a.abilityName.includes('sharpshooter') && a.canCast);
      if (sharpshooter && snap.hero.manaPercent > 50) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Sharpshooter ready. Bushwhack first to root, then charge a full Sharpshooter for guaranteed hit.',
          cooldownKey: 'hw_snipe', cooldownSeconds: 45,
        });
      }
    }

    if (snap.hero.alive && snap.hero.manaPercent > 40) {
      const bushwhack = snap.abilities.find(a => a.abilityName.includes('bushwhack') && a.canCast);
      const acorn = snap.abilities.find(a => a.abilityName.includes('acorn_shot') && a.canCast);
      if (bushwhack && acorn) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Acorn Shot then Bushwhack combo ready. Hit an Acorn Shot near a tree to set up a free Bushwhack root.',
          cooldownKey: 'hw_combo', cooldownSeconds: 20,
        });
      }
    }

    if (snap.hero.healthPercent < 40 && snap.hero.alive) {
      recs.push({
        priority: 'high', category: 'positioning',
        message: 'Use Scurry to escape danger and juke in trees. Hoodwink is fragile — stay mobile.',
        cooldownKey: 'hw_scurry', cooldownSeconds: 15,
      });
    }

    if (snap.phase !== 'laning') {
      const gleipnir = snap.items.some(i => i.itemName.includes('gleipnir'));
      if (!gleipnir && snap.player.gold > 4000) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Gleipnir is excellent on Hoodwink — roots in an area and sets up Sharpshooter combos.',
          cooldownKey: 'hw_gleipnir', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
