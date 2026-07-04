// ============================================================================
// GankMeDaddy — Storm Spirit Strategy (Hero ID: 17)
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const stormSpiritStrategy: HeroStrategy = {
  heroId: 17,
  heroName: 'Storm Spirit',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    // --- Pre-6 passive farming ---
    if (snap.hero.level < 6 && snap.phase === 'laning') {
      recs.push({
        priority: 'low',
        category: 'farming',
        message: 'Storm Spirit is weak before 6. Focus on getting every last hit. Use Remnant to secure ranged creeps.',
        cooldownKey: 'storm_pre6',
        cooldownSeconds: 180,
      });
    }

    // --- Level 6 — the biggest power spike in Dota ---
    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical',
        category: 'power_spike',
        message: 'Level 6! Ball Lightning is online. This is Storm Spirits biggest power spike. Look for a kill with Overload procs.',
        cooldownKey: 'storm_lvl6',
        cooldownSeconds: 300,
      });
    }

    // --- Mana management is EVERYTHING on Storm ---
    if (snap.hero.alive && snap.hero.level >= 6) {
      if (snap.hero.manaPercent < 30) {
        recs.push({
          priority: 'critical',
          category: 'mana',
          message: 'Low mana on Storm Spirit. You cannot fight or escape. Get mana regen immediately.',
          cooldownKey: 'storm_low_mana',
          cooldownSeconds: 20,
        });
      } else if (snap.hero.manaPercent > 70) {
        // Check for kill potential
        const zip = snap.abilities.find(a =>
          a.abilityName.includes('ball_lightning') && a.level > 0
        );
        const vortex = snap.abilities.find(a =>
          a.abilityName.includes('electric_vortex') && a.level > 0
        );
        if (zip?.canCast && vortex?.canCast) {
          recs.push({
            priority: 'high',
            category: 'aggression',
            message: 'High mana pool. You have kill potential. Zip in, Vortex, and proc Overload to secure a kill.',
            cooldownKey: 'storm_go_in',
            cooldownSeconds: 30,
          });
        }
      }
    }

    // --- Kaya / Orchid timing ---
    if (snap.hero.level >= 8) {
      const hasKaya = snap.items.some(i =>
        i.itemName.includes('kaya') || i.itemName.includes('yasha_and_kaya') ||
        i.itemName.includes('bloodstone')
      );
      const hasOrchid = snap.items.some(i =>
        i.itemName.includes('orchid') || i.itemName.includes('bloodthorn')
      );

      if (!hasKaya && !hasOrchid) {
        recs.push({
          priority: 'medium',
          category: 'item',
          message: 'Rush a mana sustain item. Kaya or Orchid. Storm needs mana efficiency to fight constantly.',
          cooldownKey: 'storm_mana_item',
          cooldownSeconds: 180,
        });
      }
    }

    // --- Overload proc reminder ---
    if (snap.hero.level >= 3 && snap.phase === 'laning') {
      recs.push({
        priority: 'low',
        category: 'aggression',
        message: 'Weave Overload procs between spells. Cast a spell, right-click, cast a spell, right-click.',
        cooldownKey: 'storm_overload',
        cooldownSeconds: 300,
      });
    }

    // --- Bloodstone power spike ---
    if (snap.phase === 'midgame') {
      const hasBloodstone = snap.items.some(i => i.itemName.includes('bloodstone'));
      if (hasBloodstone) {
        recs.push({
          priority: 'high',
          category: 'power_spike',
          message: 'Bloodstone is up. You are at peak power. Be aggressive. Take fights. Storm falls off later.',
          cooldownKey: 'storm_bloodstone_spike',
          cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
