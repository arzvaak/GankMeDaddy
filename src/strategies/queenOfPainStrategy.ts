// ============================================================================
// GankMeDaddy — Queen of Pain Strategy (Hero ID: 39)
// ============================================================================

import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const queenOfPainStrategy: HeroStrategy = {
  heroId: 39,
  heroName: 'Queen of Pain',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];

    // Blink + Scream harass
    if (snap.hero.level >= 2 && snap.phase === 'laning') {
      const blink = snap.abilities.find(a => a.abilityName.includes('blink') && a.level > 0);
      const scream = snap.abilities.find(a => a.abilityName.includes('scream_of_pain') && a.level > 0);
      if (blink?.canCast && scream?.canCast && snap.hero.manaPercent > 40) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Blink Scream combo ready. Blink in, Scream, blink back. Free damage.',
          cooldownKey: 'qop_combo', cooldownSeconds: 15,
        });
      }
    }

    // Level 6 Sonic Wave
    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Sonic Wave deals massive pure damage. Look for a kill or gank a side lane.',
        cooldownKey: 'qop_lvl6', cooldownSeconds: 300,
      });
    }

    // Rune control with blink mobility
    if (snap.phase === 'laning') {
      const nextRune = Math.ceil(snap.clockTime / 120) * 120;
      const timeToRune = nextRune - snap.clockTime;
      if (timeToRune > 0 && timeToRune <= 15) {
        recs.push({
          priority: 'high', category: 'rune',
          message: 'Rune spawning soon. QOP can blink to rune faster than anyone. Secure it.',
          cooldownKey: `qop_rune_${nextRune}`, cooldownSeconds: 60,
        });
      }
    }

    // Orchid timing
    if (snap.hero.level >= 10 && snap.phase === 'midgame') {
      const hasOrchid = snap.items.some(i =>
        i.itemName.includes('orchid') || i.itemName.includes('bloodthorn')
      );
      if (!hasOrchid) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Orchid gives QOP solo kill potential on almost anyone. Consider rushing it.',
          cooldownKey: 'qop_orchid', cooldownSeconds: 180,
        });
      }
    }

    // QOP should always be making plays
    if (snap.phase === 'midgame' && snap.player.kills === 0 && snap.clockTime > 720) {
      recs.push({
        priority: 'high', category: 'aggression',
        message: 'Zero kills at 12 minutes on QOP. You need to be making plays and hunting for pickoffs.',
        cooldownKey: 'qop_passive', cooldownSeconds: 180,
      });
    }

    return recs;
  },
};
