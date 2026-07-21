import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const axeStrategy: HeroStrategy = {
  heroId: 2,
  heroName: 'Axe',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Culling Blade online. You can execute low-HP enemies and reset with bonus movespeed.',
        cooldownKey: 'axe_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.alive && snap.hero.healthPercent > 60 && snap.hero.manaPercent > 40) {
      const call = snap.abilities.find(a => a.abilityName.includes('berserkers_call') && a.canCast);
      if (call) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Berserker\'s Call ready. Blink in, Call multiple enemies, and spin them down.',
          cooldownKey: 'axe_call', cooldownSeconds: 30,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const hunger = snap.abilities.find(a => a.abilityName.includes('battle_hunger') && a.canCast);
      if (hunger) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Battle Hunger ready. Apply it to the offlaner to zone them or force them to last-hit.',
          cooldownKey: 'axe_hunger', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'midgame' && t > 600) {
      const hasBlink = snap.items.some(i => i.itemName.includes('blink'));
      if (!hasBlink && snap.player.gold > 1800) {
        recs.push({
          priority: 'high', category: 'item',
          message: 'Blink Dagger is core on Axe. Save for it — Blink into Call wins fights.',
          cooldownKey: 'axe_blink', cooldownSeconds: 180,
        });
      }
    }

    if (snap.phase !== 'laning') {
      const bladeMail = snap.items.some(i => i.itemName.includes('blade_mail'));
      if (!bladeMail && snap.player.gold > 1800) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Blade Mail turns Axe into a deadly counter-initiatior. Call and watch enemies kill themselves.',
          cooldownKey: 'axe_blademail', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
