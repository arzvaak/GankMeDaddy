import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const rubickStrategy: HeroStrategy = {
  heroId: 86,
  heroName: 'Rubick',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Spell Steal is online. Position near big teamfight ultimates to steal them.',
        cooldownKey: 'rb_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive) {
      const spellSteal = snap.abilities.find(a => a.abilityName.includes('spell_steal') && a.canCast);
      if (spellSteal && snap.hero.manaPercent > 60) {
        recs.push({
          priority: 'high', category: 'save',
          message: 'Spell Steal ready. Stay alive and wait for a big ultimate to steal — Black Hole, Ravage, or RP.',
          cooldownKey: 'rb_steal_ready', cooldownSeconds: 60,
        });
      }
    }

    if (snap.hero.alive && snap.hero.manaPercent > 50) {
      const telekinesis = snap.abilities.find(a => a.abilityName.includes('telekinesis') && a.canCast);
      if (telekinesis) {
        recs.push({
          priority: 'medium', category: 'save',
          message: 'Telekinesis ready. Use it to lift a key enemy or save a core from a gank.',
          cooldownKey: 'rb_lift', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 40) {
      const fadeBolt = snap.abilities.find(a => a.abilityName.includes('fade_bolt') && a.canCast);
      if (fadeBolt) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Fade Bolt ready. Use it to harass and reduce enemy damage in trades.',
          cooldownKey: 'rb_bolt', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase !== 'laning') {
      const hasAghs = snap.items.some(i => i.itemName.includes('aghanims'));
      if (!hasAghs && snap.player.gold > 3500) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Aghanim\'s Scepter on Rubick gives you two stolen spells and longer cast range. Huge value.',
          cooldownKey: 'rb_aghs', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
