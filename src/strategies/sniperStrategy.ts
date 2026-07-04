// ============================================================================
// GankMeDaddy — Sniper Strategy (Hero ID: 35)
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const sniperStrategy: HeroStrategy = {
  heroId: 35,
  heroName: 'Sniper',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    // --- Positioning is everything on Sniper ---
    // Sniper is extremely vulnerable to ganks — if enemies are missing, warn
    if (snap.hero.alive && snap.phase === 'laning' && t > 180) {
      recs.push({
        priority: 'medium',
        category: 'positioning',
        message: 'Stay at max range. Sniper dies to ganks. Keep distance and use Shrapnel to control the lane.',
        cooldownKey: 'sniper_position',
        cooldownSeconds: 120,
      });
    }

    // --- Shrapnel for rune control ---
    if (snap.phase === 'laning') {
      const nextRuneApprox = Math.ceil(t / 120) * 120;
      const timeToRune = nextRuneApprox - t;
      if (timeToRune > 0 && timeToRune <= 15) {
        const shrapnel = snap.abilities.find(a =>
          a.abilityName.includes('shrapnel') && a.level > 0
        );
        if (shrapnel && shrapnel.canCast) {
          recs.push({
            priority: 'high',
            category: 'rune',
            message: 'Use Shrapnel on the rune spot to control it. You dont need to walk there.',
            cooldownKey: `sniper_rune_${nextRuneApprox}`,
            cooldownSeconds: 60,
          });
        }
      }
    }

    // --- Level 6 Assassinate pressure ---
    if (snap.hero.level === 6) {
      recs.push({
        priority: 'high',
        category: 'power_spike',
        message: 'Level 6. Assassinate is online. Watch for low HP heroes across the map.',
        cooldownKey: 'sniper_lvl6',
        cooldownSeconds: 300,
      });
    }

    // --- Dragon Lance timing ---
    if (snap.hero.level >= 7 && snap.phase === 'laning') {
      const hasDragonLance = snap.items.some(i => i.itemName.includes('dragon_lance'));
      const hasHurricane = snap.items.some(i => i.itemName.includes('hurricane_pike'));
      if (!hasDragonLance && !hasHurricane) {
        recs.push({
          priority: 'medium',
          category: 'item',
          message: 'Dragon Lance gives you extra range and survivability. Prioritize it.',
          cooldownKey: 'sniper_dlance',
          cooldownSeconds: 180,
        });
      }
    }

    // --- Sniper is squishy — low HP is extra dangerous ---
    if (snap.hero.healthPercent < 40 && snap.hero.alive) {
      recs.push({
        priority: 'critical',
        category: 'positioning',
        message: 'Very low HP on Sniper. You are a free kill right now. Back to safety immediately.',
        cooldownKey: 'sniper_danger',
        cooldownSeconds: 20,
      });
    }

    // --- Headshot harass during laning ---
    if (snap.phase === 'laning' && snap.hero.level >= 2 && snap.hero.alive) {
      const headshot = snap.abilities.find(a =>
        a.abilityName.includes('headshot') && a.level > 0
      );
      if (headshot) {
        recs.push({
          priority: 'low',
          category: 'aggression',
          message: 'Use your range advantage. Right-click the enemy mid between last hits. Headshot procs win lanes.',
          cooldownKey: 'sniper_harass',
          cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
