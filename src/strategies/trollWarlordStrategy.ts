import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const trollWarlordStrategy: HeroStrategy = {
  heroId: 95,
  heroName: 'Troll Warlord',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Battle Trance online. Your team gains massive attack speed — take Roshan or push a tower.',
        cooldownKey: 'tw_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 40) {
      const trance = snap.abilities.find(a => a.abilityName.includes('battle_trance') && a.canCast);
      if (trance) {
        recs.push({
          priority: 'critical', category: 'aggression',
          message: 'Battle Trance ready. Pop it to shred towers or Roshan — your team\'s attack speed is doubled.',
          cooldownKey: 'tw_trance', cooldownSeconds: 90,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 20) {
      const axes = snap.abilities.find(a => a.abilityName.includes('whirling_axes') && a.canCast);
      if (axes) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Whirling Axes ready. Ranged form for slow, melee form for blind — use whichever fits the situation.',
          cooldownKey: 'tw_axes', cooldownSeconds: 15,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 40 && snap.hero.healthPercent > 0) {
      const meleeForm = snap.abilities.some(a => a.abilityName.includes('berserkers_rage') && a.level > 0);
      if (meleeForm) {
        recs.push({
          priority: 'high', category: 'save',
          message: 'Switch to melee form for higher armor and HP regen. Troll is tankier in melee stance.',
          cooldownKey: 'tw_form', cooldownSeconds: 15,
        });
      }
    }

    if (t > 600 && snap.player.lastHits < 80) {
      recs.push({
        priority: 'medium', category: 'farming',
        message: 'Troll farms fast with Fervor stacks. Keep your damage on creeps between fights.',
        cooldownKey: 'tw_farm', cooldownSeconds: 120,
      });
    }

    if (snap.phase !== 'laning' && snap.hero.level >= 12) {
      const bkb = snap.items.some(i => i.itemName.includes('black_king_bar'));
      if (!bkb) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Black King Bar on Troll is non-negotiable. You need spell immunity to use Battle Trance in fights.',
          cooldownKey: 'tw_bkb', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
