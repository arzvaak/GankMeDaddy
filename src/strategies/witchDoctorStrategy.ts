import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const witchDoctorStrategy: HeroStrategy = {
  heroId: 30,
  heroName: 'Witch Doctor',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Death Ward online. Hide behind trees or your initiator before casting.',
        cooldownKey: 'wd_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive) {
      const deathWard = snap.abilities.find(a => a.abilityName.includes('death_ward') && a.canCast);
      const maledict = snap.abilities.find(a => a.abilityName.includes('maledict') && a.canCast);
      if (deathWard && maledict && snap.hero.manaPercent > 50) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Maledict plus Death Ward combo is ready. Apply Maledict first, then channel Death Ward.',
          cooldownKey: 'wd_combo', cooldownSeconds: 60,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 40 && snap.hero.healthPercent > 0) {
      const heal = snap.abilities.find(a => a.abilityName.includes('voodoo_restoration') && a.level > 0);
      if (heal && snap.hero.manaPercent > 30) {
        recs.push({
          priority: 'medium', category: 'mana',
          message: 'Turn on Voodoo Restoration to heal yourself and nearby allies.',
          cooldownKey: 'wd_heal', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 40) {
      const cask = snap.abilities.find(a => a.abilityName.includes('paralyzing_cask') && a.canCast);
      if (cask) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Paralyzing Cask ready. Bounce it between enemies for a long stun.',
          cooldownKey: 'wd_cask', cooldownSeconds: 25,
        });
      }
    }

    if (snap.phase !== 'laning') {
      const hasAghs = snap.items.some(i => i.itemName.includes('aghanims'));
      if (!hasAghs && snap.player.gold > 3500) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Aghanim\'s Scepter turns Death Ward into an area attack. Huge teamfight upgrade.',
          cooldownKey: 'wd_aghs', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
