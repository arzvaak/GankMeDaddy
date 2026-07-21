import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const crystalMaidenStrategy: HeroStrategy = {
  heroId: 5,
  heroName: 'Crystal Maiden',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 2 && snap.hero.manaPercent > 40) {
      recs.push({
        priority: 'high', category: 'power_spike',
        message: 'Level 2 Crystal Maiden. Frostbite secures a kill. Look for a root on the offlaner.',
        cooldownKey: 'cm_lvl2', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Freezing Field is online. Hide in trees or behind your initiator before casting.',
        cooldownKey: 'cm_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.alive && snap.hero.manaPercent < 25 && snap.hero.manaPercent > 0) {
      recs.push({
        priority: 'high', category: 'mana',
        message: 'Crystal Maiden has very low mana. Use clarity or shrine. Your spells win fights.',
        cooldownKey: 'cm_mana', cooldownSeconds: 30,
      });
    }

    if (snap.phase === 'laning' && t > 120 && snap.hero.manaPercent > 50 && snap.hero.alive) {
      const hasNova = snap.abilities.some(a => a.abilityName.includes('crystal_nova') && a.canCast);
      if (hasNova) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Crystal Nova is up. Slow the offlaner to zone them or set up a Frostbite.',
          cooldownKey: 'cm_nova_harass', cooldownSeconds: 30,
        });
      }
    }

    if (snap.phase !== 'laning' && snap.hero.level >= 12) {
      const hasAghs = snap.items.some(i => i.itemName.includes('aghanims'));
      const hasShard = snap.items.some(i => i.itemName.includes('shard'));
      if (!hasShard && t > 1200) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Aghanim\'s Shard is great on Crystal Maiden — it lets you move while channeling Freezing Field.',
          cooldownKey: 'cm_shard', cooldownSeconds: 300,
        });
      }
      if (!hasAghs && snap.player.gold > 3000) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Consider Aghanim\'s Scepter for a second charge and improved Freezing Field.',
          cooldownKey: 'cm_aghs', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
