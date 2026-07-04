// ============================================================================
// GankMeDaddy — Zeus Strategy (Hero ID: 22)
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const zeusStrategy: HeroStrategy = {
  heroId: 22,
  heroName: 'Zeus',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];

    // Arc Lightning spam for CS + harass
    if (snap.phase === 'laning' && snap.hero.level >= 1) {
      recs.push({
        priority: 'low', category: 'farming',
        message: 'Use Arc Lightning to secure last hits and harass simultaneously. Every cast procs passive.',
        cooldownKey: 'zeus_arc', cooldownSeconds: 180,
      });
    }

    // Mana management — Zeus is mana hungry
    if (snap.hero.manaPercent < 25 && snap.hero.alive) {
      recs.push({
        priority: 'critical', category: 'mana',
        message: 'Critical mana on Zeus. You have no damage without mana. Use Bottle or Clarity.',
        cooldownKey: 'zeus_mana', cooldownSeconds: 20,
      });
    }

    // Level 6 Thundergods Wrath
    if (snap.hero.level === 6) {
      recs.push({
        priority: 'high', category: 'power_spike',
        message: 'Level 6. Thundergods Wrath is global. Watch the map for low HP enemies to snipe.',
        cooldownKey: 'zeus_lvl6', cooldownSeconds: 300,
      });
    }

    // Global kill steal detection — ult available + enemy might be low
    if (snap.hero.level >= 6) {
      const ult = snap.abilities.find(a =>
        a.abilityName.includes('thundergods_wrath') && a.level > 0
      );
      if (ult?.canCast && snap.hero.manaPercent > 30) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Thundergods Wrath is ready. Keep an eye on fights across the map for kill steals.',
          cooldownKey: 'zeus_ult_ready', cooldownSeconds: 30,
        });
      }
    }

    // Nimbus placement (Aghs)
    if (snap.items.some(i => i.itemName.includes('ultimate_scepter'))) {
      recs.push({
        priority: 'high', category: 'power_spike',
        message: 'Aghanims online. Use Nimbus on top of fights or to scout Roshan.',
        cooldownKey: 'zeus_aghs_spike', cooldownSeconds: 300,
      });
    }

    // Bottle is essential on Zeus
    if (snap.phase === 'laning' && snap.hero.level >= 2) {
      const hasBottle = snap.items.some(i => i.itemName.includes('bottle'));
      if (!hasBottle && snap.player.gold > 700) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Buy Bottle immediately. Zeus cannot function without mana regen.',
          cooldownKey: 'zeus_bottle', cooldownSeconds: 120,
        });
      }
    }

    // Arcane Boots for mana sustain
    if (snap.hero.level >= 5 && snap.phase === 'laning') {
      const hasArcane = snap.items.some(i => i.itemName.includes('arcane_boots'));
      const hasBottle = snap.items.some(i => i.itemName.includes('bottle'));
      if (hasBottle && !hasArcane) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Arcane Boots next for mana sustain. Zeus needs all the mana he can get.',
          cooldownKey: 'zeus_arcane', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
