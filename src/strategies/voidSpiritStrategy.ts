// ============================================================================
// GankMeDaddy — Void Spirit Strategy (Hero ID: 126)
// Data-driven coaching using real professional match data
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const voidSpiritStrategy: HeroStrategy = {
  heroId: 126,
  heroName: 'Void Spirit',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    // --- Level-based power spike alerts ---
    if (snap.hero.level === 3) {
      recs.push({
        priority: 'high',
        category: 'power_spike',
        message: 'Level 3 power spike. Dissimilate plus Resonant Pulse combo can kill. Look for an aggressive play.',
        cooldownKey: 'vs_lvl3',
        cooldownSeconds: 300,
      });
    }

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical',
        category: 'power_spike',
        message: 'Level 6. Astral Step is online. You have massive kill threat. Play hyper aggressive here.',
        cooldownKey: 'vs_lvl6',
        cooldownSeconds: 300,
      });
    }

    // --- Mana management for combos ---
    if (snap.hero.manaPercent < 35 && snap.hero.manaPercent > 0 && snap.hero.alive) {
      recs.push({
        priority: 'high',
        category: 'mana',
        message: 'Low mana on Void Spirit. You need mana for a full combo. Regen before fighting.',
        cooldownKey: 'vs_mana',
        cooldownSeconds: 30,
      });
    }

    // --- Rotation timing with Astral Step ---
    if (snap.hero.level >= 6 && snap.phase === 'laning' && t > 360) {
      // Check if ultimate is available
      const astralStep = snap.abilities.find(a =>
        a.abilityName.includes('astral_step') && a.level > 0
      );
      if (astralStep && astralStep.canCast && snap.hero.manaPercent > 50) {
        recs.push({
          priority: 'medium',
          category: 'rotation',
          message: 'Astral Step is ready and you have mana. Consider rotating early to gank a side lane.',
          cooldownKey: 'vs_rotate',
          cooldownSeconds: 60,
        });
      }
    }

    // --- Dissimilate usage reminder when taking damage ---
    if (snap.hero.healthPercent < 50 && snap.hero.healthPercent > 15 && snap.hero.alive) {
      const dissimilate = snap.abilities.find(a =>
        a.abilityName.includes('dissimilate') && a.level > 0
      );
      if (dissimilate && dissimilate.canCast) {
        recs.push({
          priority: 'high',
          category: 'positioning',
          message: 'Use Dissimilate to dodge and reposition. Dont panic.',
          cooldownKey: 'vs_dissimilate',
          cooldownSeconds: 15,
        });
      }
    }

    // --- Aghs timing reminder ---
    if (snap.phase === 'midgame' && snap.hero.level >= 12) {
      const hasAghs = snap.items.some(i =>
        i.itemName.includes('ultimate_scepter') || i.itemName.includes('aghanims')
      );
      if (!hasAghs && snap.player.gold > 3000) {
        recs.push({
          priority: 'medium',
          category: 'item',
          message: 'Rushing Aghanim\'s Scepter is excellent on Void Spirit for the extra Astral Step charge. Consider it.',
          cooldownKey: 'vs_aghs',
          cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
