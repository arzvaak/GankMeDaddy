// ============================================================================
// GankMeDaddy — Kez Strategy (Hero ID: 145)
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const kezStrategy: HeroStrategy = {
  heroId: 145,
  heroName: 'Kez',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    // --- Level 6 Stance & Ultimate Spike ---
    if (snap.hero.level === 6) {
      recs.push({
        priority: 'high',
        category: 'power_spike',
        message: 'Level 6 on Kez. Your ultimate is a massive teamfight tool. Coordinate with your supports for a kill.',
        cooldownKey: 'kez_lvl6_spike',
        cooldownSeconds: 300,
      });
    }

    // --- Low HP Defensive Sai Stance reminder ---
    if (snap.hero.alive && snap.hero.healthPercent < 40) {
      recs.push({
        priority: 'high',
        category: 'positioning',
        message: 'Low health. Swap to Sai stance for defensive parrying and lifesteal.',
        cooldownKey: 'kez_low_hp_sai',
        cooldownSeconds: 60,
      });
    }

    // --- Stance Versatility Reminder ---
    if (snap.phase === 'laning' && t > 180) {
      recs.push({
        priority: 'low',
        category: 'aggression',
        message: 'Remember: Katana has longer range and sweep, Sai has faster attack speed and armor pierce. Swap frequently.',
        cooldownKey: 'kez_stance_remind',
        cooldownSeconds: 180,
      });
    }

    // --- Falcon Blade or Echo Sabre timing ---
    if (snap.phase === 'laning' && t > 480) {
      const hasCoreItem = snap.items.some(i =>
        i.itemName.includes('falcon_blade') || 
        i.itemName.includes('echo_sabre') || 
        i.itemName.includes('diffusal_blade')
      );
      if (!hasCoreItem) {
        recs.push({
          priority: 'medium',
          category: 'item',
          message: 'Secure your early mana regen item like Falcon Blade or Diffusal Blade to sustain your abilities.',
          cooldownKey: 'kez_early_core_item',
          cooldownSeconds: 150,
        });
      }
    }

    return recs;
  },
};
