import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const juggernautStrategy: HeroStrategy = {
  heroId: 8,
  heroName: 'Juggernaut',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Omnislash online. Look for isolated enemies — ult kills squishy heroes.',
        cooldownKey: 'jg_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 50) {
      const omni = snap.abilities.find(a => a.abilityName.includes('omnislash') && a.canCast);
      if (omni) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Omnislash ready. Blade Fury first to close the gap, then Omnislash for the kill.',
          cooldownKey: 'jg_omni', cooldownSeconds: 60,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const fury = snap.abilities.find(a => a.abilityName.includes('blade_fury') && a.canCast);
      if (fury) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Blade Fury ready. Spin in to deal damage and dodge enemy spells. Don\'t overextend.',
          cooldownKey: 'jg_fury', cooldownSeconds: 20,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 50 && snap.hero.healthPercent > 0) {
      const ward = snap.abilities.find(a => a.abilityName.includes('healing_ward') && a.canCast);
      if (ward) {
        recs.push({
          priority: 'medium', category: 'save',
          message: 'Healing Ward ready. Drop it behind you to regen between fights or sustain in lane.',
          cooldownKey: 'jg_ward', cooldownSeconds: 30,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const maelstrom = snap.items.some(i => i.itemName.includes('maelstrom'));
      const mjollnir = snap.items.some(i => i.itemName.includes('mjollnir'));
      if (!maelstrom && !mjollnir && t > 600) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Maelstrom boosts Juggernaut\'s farm speed and works well with his attack speed. Build towards Mjollnir.',
          cooldownKey: 'jg_mael', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
