import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const phantomAssassinStrategy: HeroStrategy = {
  heroId: 44,
  heroName: 'Phantom Assassin',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Coup de Grâce online. Your crits can oneshot supports. Look for a pick-off.',
        cooldownKey: 'pa_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 25) {
      const dagger = snap.abilities.find(a => a.abilityName.includes('stifling_dagger') && a.canCast);
      if (dagger) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Stifling Dagger ready. Harass the offlaner from range — it applies your crit and slow.',
          cooldownKey: 'pa_dagger', cooldownSeconds: 15,
        });
      }
    }

    if (snap.phase === 'laning' && snap.hero.level >= 6) {
      const hasBlur = snap.abilities.some(a => a.abilityName.includes('blur') && a.level > 0);
      if (hasBlur && snap.hero.healthPercent < 50) {
        recs.push({
          priority: 'medium', category: 'positioning',
          message: 'Blur gives evasion when enemies are not nearby. Use fog to stay safe and regen.',
          cooldownKey: 'pa_blur', cooldownSeconds: 60,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const hasBfury = snap.items.some(i => i.itemName.includes('battle_fury'));
      const hasDeso = snap.items.some(i => i.itemName.includes('desolator'));
      if (!hasBfury && !hasDeso && t > 600) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'You need a farming item on Phantom Assassin. Battle Fury for farm or Desolator for early fighting.',
          cooldownKey: 'pa_farm_item', cooldownSeconds: 180,
        });
      }
    }

    if (snap.phase !== 'laning' && snap.player.gpm < 500 && t > 600) {
      recs.push({
        priority: 'medium', category: 'farming',
        message: 'Your GPM is low for Phantom Assassin. Focus on farming jungle camps between fights.',
        cooldownKey: 'pa_farm', cooldownSeconds: 120,
      });
    }

    if (snap.hero.level >= 18 && t > 1800) {
      const bkb = snap.items.some(i => i.itemName.includes('black_king_bar'));
      if (!bkb) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Black King Bar is critical on Phantom Assassin late game. You need it to jump on backlines.',
          cooldownKey: 'pa_bkb', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
