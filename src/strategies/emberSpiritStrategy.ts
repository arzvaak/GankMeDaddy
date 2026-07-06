// ============================================================================
// GankMeDaddy — Ember Spirit Strategy (Hero ID: 106)
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const emberSpiritStrategy: HeroStrategy = {
  heroId: 106,
  heroName: 'Ember Spirit',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];

    // --- Remnant safety check ---
    if (snap.hero.alive && snap.phase !== 'lategame') {
      const remnant = snap.abilities.find(a =>
        a.abilityName.includes('fire_remnant') && a.level > 0
      );
      if (remnant && remnant.canCast) {
        recs.push({
          priority: 'low',
          category: 'positioning',
          message: 'Always leave a Fire Remnant in a safe position before fighting. Its your escape.',
          cooldownKey: 'ember_remnant_safety',
          cooldownSeconds: 120,
        });
      }
    }

    // --- Level 2-3 Chains + Fist combo ---
    if (snap.hero.level >= 2 && snap.hero.level <= 5) {
      const chains = snap.abilities.find(a =>
        a.abilityName.includes('searing_chains') && a.level > 0
      );
      const fists = snap.abilities.find(a =>
        a.abilityName.includes('sleight_of_fist') && a.level > 0
      );
      if (chains?.canCast && fists?.canCast && snap.hero.manaPercent > 40) {
        recs.push({
          priority: 'medium',
          category: 'aggression',
          message: 'Sleight plus Chains combo ready. Use it to harass or secure a kill in lane.',
          cooldownKey: 'ember_combo_lane',
          cooldownSeconds: 15,
        });
      }
    }

    // --- Level 6 rotation potential ---
    if (snap.hero.level === 6) {
      recs.push({
        priority: 'high',
        category: 'power_spike',
        message: 'Level 6. Fire Remnant gives you insane mobility. Set a remnant in lane and gank a side lane.',
        cooldownKey: 'ember_lvl6',
        cooldownSeconds: 300,
      });
    }

    // --- Maelstrom timing ---
    if (snap.hero.level >= 8 && snap.phase === 'laning') {
      const hasMael = snap.items.some(i =>
        i.itemName.includes('maelstrom') || i.itemName.includes('mjollnir')
      );
      if (!hasMael) {
        recs.push({
          priority: 'medium',
          category: 'item',
          message: 'Maelstrom is the key farming accelerator. Sleight of Fist with Maelstrom clears waves instantly.',
          cooldownKey: 'ember_mael',
          cooldownSeconds: 180,
        });
      }
    }

    // --- Aggressive play with remnant safety ---
    if (snap.phase === 'midgame' && snap.hero.alive) {
      recs.push({
        priority: 'low',
        category: 'aggression',
        message: 'Ember thrives on chaos. Remnant behind you, dive in, and remnant back to safety.',
        cooldownKey: 'ember_aggression',
        cooldownSeconds: 180,
      });
    }

    // --- Low mana is especially dangerous on Ember ---
    if (snap.hero.manaPercent < 25 && snap.hero.alive && snap.hero.level >= 6) {
      recs.push({
        priority: 'critical',
        category: 'mana',
        message: 'Critical mana on Ember. You cant remnant out without mana. Disengage now.',
        cooldownKey: 'ember_no_mana',
        cooldownSeconds: 20,
      });
    }

    return recs;
  },
};
