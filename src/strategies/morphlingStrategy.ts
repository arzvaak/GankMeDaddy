import { HeroStrategy, MatchSnapshot, CoachingRecommendation } from '../coaching/types';

export const morphlingStrategy: HeroStrategy = {
  heroId: 10,
  heroName: 'Morphling',

  analyzeSnapshot(snap: MatchSnapshot): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const t = snap.clockTime;

    if (snap.hero.level === 6) {
      recs.push({
        priority: 'critical', category: 'power_spike',
        message: 'Level 6. Morphling spike. Adaptive Strike at level 4 gives big burst. Look for Waveform into Strike kills.',
        cooldownKey: 'mp_lvl6', cooldownSeconds: 300,
      });
    }

    if (snap.hero.level >= 6 && snap.hero.alive && snap.hero.manaPercent > 60) {
      const strike = snap.abilities.find(a => a.abilityName.includes('adaptive_strike') && a.canCast);
      if (strike) {
        recs.push({
          priority: 'high', category: 'aggression',
          message: 'Waveform into Adaptive Strike combo ready. Burst a squishy target before they react.',
          cooldownKey: 'mp_shotgun', cooldownSeconds: 45,
        });
      }
    }

    if (snap.hero.alive && snap.hero.healthPercent < 30 && snap.hero.healthPercent > 0) {
      recs.push({
        priority: 'high', category: 'save',
        message: 'Morph to max agility for damage or max strength for survivability. Shift attribute points based on the situation.',
        cooldownKey: 'mp_morph', cooldownSeconds: 10,
      });
    }

    if (snap.phase === 'laning' && t > 60 && snap.hero.manaPercent > 30) {
      const waveform = snap.abilities.find(a => a.abilityName.includes('waveform') && a.canCast);
      if (waveform) {
        recs.push({
          priority: 'medium', category: 'aggression',
          message: 'Waveform ready. Use it to dodge a spell and land a kill simultaneously.',
          cooldownKey: 'mp_wave', cooldownSeconds: 20,
        });
      }
    }

    if (snap.phase === 'midgame') {
      const linken = snap.items.some(i => i.itemName.includes('linkens'));
      if (!linken && t > 900) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Linken\'s Sphere on Morphling blocks the first incoming spell — essential against instant-stun lineups.',
          cooldownKey: 'mp_linken', cooldownSeconds: 180,
        });
      }
    }

    if (snap.hero.level >= 12 && snap.hero.alive) {
      const manta = snap.items.some(i => i.itemName.includes('manta'));
      if (!manta && snap.player.gold > 3500) {
        recs.push({
          priority: 'medium', category: 'item',
          message: 'Manta Style removes silences and lets Morphling push lanes safely with illusions.',
          cooldownKey: 'mp_manta', cooldownSeconds: 180,
        });
      }
    }

    return recs;
  },
};
