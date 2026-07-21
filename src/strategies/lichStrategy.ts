import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const lichStrategy: HeroStrategy = {
  heroId: 31,
  heroName: 'Lich',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Chain Frost is online. Group up and push a tower or force a fight.',
        cooldownKey: 'lich_lvl6', cooldownSeconds: 300,
      });
    }

    const frostShield = snap.abilities.find(a => a.abilityName.includes('frost_shield') && a.level > 0);
    if (frostShield && frostShield.canCast && snap.hero.alive) {
      const lowCore = snap.hero.healthPercent < 50;
      if (lowCore) {
        recs.push({
          priority: 'high', category: 'save',
          message: 'Frost Shield ready. Cast it on your carry for armor and slow against right-clickers.',
          cooldownKey: 'lich_shield', cooldownSeconds: 30,
        });
      }
    }

    if (snap.hero.alive && snap.hero.manaPercent < 30 && snap.hero.manaPercent > 0) {
      recs.push({
        priority: 'medium', category: 'mana',
        message: 'Low mana on Lich. Use Sacrifice to regen if a creep is nearby.',
        cooldownKey: 'lich_mana', cooldownSeconds: 30,
      });
    }

    if (snap.phase === 'laning' && t > 0) {
      const gaze = snap.abilities.find(a => a.abilityName.includes('sinister_gaze') && a.canCast);
      if (gaze && snap.hero.manaPercent > 40) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Sinister Gaze is ready. Channel it on the offlaner to set up a kill for your carry.',
          cooldownKey: 'lich_gaze', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase !== 'laning' && snap.hero.level >= 12) {
      const hasShard = snap.items.some(i => i.itemName.includes('shard'));
      if (!hasShard && t > 1200) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Aghanim\'s Shard adds a second charge to Frost Shield. Very strong on Lich.',
          cooldownKey: 'lich_shard', cooldownSeconds: 300,
        });
      }
    }

    return recs;
  },
};
