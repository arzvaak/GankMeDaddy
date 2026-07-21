import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const marsStrategy: HeroStrategy = {
  heroId: 129,
  heroName: 'Mars',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Arena of Blood online. Trap enemies with your carry inside and destroy them.',
        cooldownKey: 'mars_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 60) {
      const arena = snap.abilities.find(a => a.abilityName.includes('arena_of_blood') && a.canCast);
      if (arena) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Arena of Blood ready. Spear an enemy into a wall, then trap them in the Arena.',
          cooldownKey: 'mars_arena', cooldownSeconds: 90,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const spear = snap.abilities.find(a => a.abilityName.includes('spear_of_mars') && a.canCast);
      if (spear) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Spear ready. Impale the enemy into a tree or tower for free damage — then cast God\'s Rebuke.',
          cooldownKey: 'mars_spear', cooldownSeconds: 20,
        });
      }
    }

    if (snap.hero.alive && snap.hero.manaPercent > 30) {
      const rebuke = snap.abilities.find(a => a.abilityName.includes('rebuke') && a.canCast);
      if (rebuke) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'God\'s Rebuke ready. Use it to clear creeps and harass — the crit passive makes it hit hard.',
          cooldownKey: 'mars_rebuke', cooldownSeconds: 15,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const hasBlink = snap.items.some(i => i.itemName.includes('blink'));
      if (!hasBlink && snap.player.gold > 1800) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Blink Dagger on Mars lets you position the Arena perfectly. High priority.',
          cooldownKey: 'mars_blink', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
