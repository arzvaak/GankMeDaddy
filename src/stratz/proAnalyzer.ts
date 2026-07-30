// ============================================================================
// GankMeDaddy — Pro Data Analyzer
// Fetches and analyzes pro player match data from STRATZ to derive
// item timing benchmarks, KDA patterns, and playstyle metrics per hero.
// ============================================================================

import { StratzClient } from './stratzClient';
import {
  ProHeroProfile,
  ProItemTiming,
  HERO_NAMES,
  SUPPORTED_HERO_IDS,
  Role,
  ROLE_PRO_PLAYERS,
  HERO_ROLES,
} from '../coaching/types';

const PRO_STEAM_ID = 94054712;

/**
 * Analyzes pro player STRATZ match data to build coaching benchmarks.
 */
export class ProAnalyzer {
  private stratz: StratzClient;
  private profileCache: Map<string, ProHeroProfile> = new Map();

  constructor(stratz: StratzClient) {
    this.stratz = stratz;
  }

  /**
   * Fetch and analyze pro matches for a specific hero and role.
   * Caches the result for the session.
   */
  async analyzeHero(heroId: number, role: Role = 'mid', take: number = 25): Promise<ProHeroProfile | null> {
    const cacheKey = `${heroId}_${role}`;
    if (this.profileCache.has(cacheKey)) {
      return this.profileCache.get(cacheKey)!;
    }

    const proSteamId = ROLE_PRO_PLAYERS[role] || PRO_STEAM_ID;
    const heroName = HERO_NAMES[heroId] || `Hero ${heroId}`;
    console.log(`[PRO] Fetching ${heroName} (${role}) match data from STRATZ...`);

    try {
      let matches = await this.stratz.fetchProMatches(proSteamId, [heroId], 15);

      const proPlayedMatches = (matches || []).filter((m: any) =>
        m.players?.some((p: any) => p.steamAccountId === proSteamId)
      );

      let isGuideMode = false;

      if (proPlayedMatches.length < 3) {
        console.log(`[PRO] < 3 pro matches on ${heroName} for ${role} (${proPlayedMatches.length} found). Fetching STRATZ Pro Guides instead...`);
        const guides = await this.stratz.fetchHeroGuides(heroId, 5);

        if (!guides || guides.length === 0) {
          console.log(`[PRO] No Pro Guides or pro matches found for ${heroName}`);
          return null;
        }

        const matchDetails: any[] = [];
        await Promise.all(
          guides.map(async (g) => {
            try {
              const m = await this.stratz.fetchMatchDetails(g.matchId);
              if (m) {
                m.guideSteamAccountId = g.steamAccountId;
                matchDetails.push(m);
              }
            } catch (err) {
              console.error(`[PRO] Failed to fetch guide match ${g.matchId}:`, err);
            }
          })
        );

        if (matchDetails.length === 0) {
          console.log(`[PRO] Failed to retrieve details for any guide matches on ${heroName}`);
          return null;
        }

        matches = matchDetails;
        isGuideMode = true;
      }

      const profile = this.buildProfile(heroId, heroName, matches, proSteamId);
      profile.isGuideMode = isGuideMode;
      this.profileCache.set(cacheKey, profile);

      const modeStr = isGuideMode ? 'Pro Guides' : 'Pro matches';
      console.log(`[PRO] Analyzed ${profile.matchesAnalyzed} matches for ${heroName} (${modeStr})`);
      console.log(`[PRO]   Win rate: ${(profile.winRate * 100).toFixed(1)}%`);
      console.log(`[PRO]   Avg KDA: ${profile.avgKills.toFixed(1)}/${profile.avgDeaths.toFixed(1)}/${profile.avgAssists.toFixed(1)}`);
      console.log(`[PRO]   Avg GPM: ${profile.avgGPM.toFixed(0)}, XPM: ${profile.avgXPM.toFixed(0)}`);
      if (profile.startingItems.length > 0) {
        console.log(`[PRO]   Usual starting items: ${profile.startingItems.join(', ')}`);
      }
      if (profile.itemTimings.length > 0) {
        console.log(`[PRO]   Key item timings:`);
        for (const it of profile.itemTimings.slice(0, 8)) {
          const mins = Math.floor(it.medianTime / 60);
          const secs = Math.floor(it.medianTime % 60);
          console.log(`[PRO]     ${it.itemName}: ~${mins}:${secs.toString().padStart(2, '0')} (${(it.purchaseRate * 100).toFixed(0)}% of games)`);
        }
      }

      return profile;
    } catch (err) {
      console.error(`[PRO] Failed to analyze ${heroName}:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Pre-fetch all supported heroes. Called at startup.
   */
  async preloadAllHeroes(heroIds?: number[]): Promise<void> {
    const ids = heroIds || SUPPORTED_HERO_IDS;
    console.log(`[PRO] Pre-loading data for ${ids.length} heroes...`);

    for (const heroId of ids) {
      const role = HERO_ROLES[heroId] || 'mid';
      await this.analyzeHero(heroId, role);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[PRO] Pre-load complete. Cached ${this.profileCache.size} hero profiles.`);
  }

  /**
   * Get cached profile for a hero and role.
   */
  getProfile(heroId: number, role: Role = 'mid'): ProHeroProfile | null {
    return this.profileCache.get(`${heroId}_${role}`) || null;
  }

  // -------------------------------------------------------------------------
  // Private analysis methods
  // -------------------------------------------------------------------------

  private buildProfile(heroId: number, heroName: string, matches: any[], proSteamId: number): ProHeroProfile {
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalGPM = 0, totalXPM = 0, totalDuration = 0;
    let wins = 0;
    let totalMatchesWithPlayer = 0;

    const validMatches: any[] = [];

    for (const match of matches) {
      const targetSteamId = match.guideSteamAccountId || proSteamId;
      const player = match.players?.find(
        (p: any) => p.steamAccountId === targetSteamId
      );
      if (!player) continue;

      totalMatchesWithPlayer++;
      totalKills += player.kills || 0;
      totalDeaths += player.deaths || 0;
      totalAssists += player.assists || 0;
      totalGPM += player.goldPerMinute || 0;
      totalXPM += player.experiencePerMinute || 0;
      totalDuration += match.durationSeconds || 0;
      if (player.isVictory) wins++;

      validMatches.push(match);
    }

    const winRate = totalMatchesWithPlayer > 0 ? wins / totalMatchesWithPlayer : 0;
    const n = totalMatchesWithPlayer || 1;

    const victoryMatches = validMatches.filter(m => {
      const targetSteamId = m.guideSteamAccountId || proSteamId;
      const p = m.players?.find((pl: any) => pl.steamAccountId === targetSteamId);
      return p && p.isVictory;
    });
    const itemAnalysisMatches = victoryMatches.length > 0 ? victoryMatches : validMatches;

    const itemPurchasesByItem: Map<number, number[]> = new Map();
    const buildOrders: number[][] = [];
    const startingItemCounts: Map<number, number> = new Map();

    for (const match of itemAnalysisMatches) {
      const targetSteamId = match.guideSteamAccountId || proSteamId;
      const player = match.players?.find(
        (p: any) => p.steamAccountId === targetSteamId
      );
      if (!player) continue;

      const purchases = player.stats?.itemPurchases;
      if (Array.isArray(purchases)) {
        const matchBuildOrder: number[] = [];

        for (const purchase of purchases) {
          if (!purchase.itemId || purchase.time == null) continue;

          if (purchase.time <= 0) {
            startingItemCounts.set(purchase.itemId, (startingItemCounts.get(purchase.itemId) || 0) + 1);
          }

          if (purchase.itemId !== 0 && !this.isFinishedCoreItem(purchase.itemId)) continue;

          if (!itemPurchasesByItem.has(purchase.itemId)) {
            itemPurchasesByItem.set(purchase.itemId, []);
          }
          itemPurchasesByItem.get(purchase.itemId)!.push(purchase.time);
          matchBuildOrder.push(purchase.itemId);
        }

        if (matchBuildOrder.length > 0) {
          buildOrders.push(matchBuildOrder);
        }
      }
    }

    const itemTimings: ProItemTiming[] = [];
    for (const [itemId, times] of itemPurchasesByItem.entries()) {
      if (times.length < 2) continue;

      const sorted = [...times].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const earliest = sorted[0];

      itemTimings.push({
        itemId,
        itemName: this.stratz.getItemName(itemId),
        medianTime: median,
        averageTime: avg,
        earliestTime: earliest,
        matchCount: times.length,
        totalMatches: itemAnalysisMatches.length,
        purchaseRate: times.length / itemAnalysisMatches.length,
      });
    }

    itemTimings.sort((a, b) => a.medianTime - b.medianTime);

    const typicalBuildOrder = this.deriveTypicalBuildOrder(buildOrders, itemTimings);

    const startingItems: string[] = [];
    const minMatchesForStartingItem = Math.max(1, Math.round(itemAnalysisMatches.length * 0.3));

    const sortedStartingItems = Array.from(startingItemCounts.entries())
      .filter(([_, count]) => count >= minMatchesForStartingItem)
      .sort((a, b) => b[1] - a[1]);

    for (const [itemId, count] of sortedStartingItems) {
      const displayName = this.stratz.getItemName(itemId);
      if (displayName && displayName !== `Item #${itemId}`) {
        const avgCount = Math.round(count / itemAnalysisMatches.length);
        let name = displayName;
        if (avgCount > 1) {
          if (name.toLowerCase().includes('branch')) {
            name = `${name}es`;
          } else {
            name = `${name}s`;
          }
          startingItems.push(`${avgCount} ${name}`);
        } else {
          startingItems.push(name);
        }
      }
    }

    return {
      heroId,
      heroName,
      matchesAnalyzed: totalMatchesWithPlayer,
      winRate,
      avgKills: totalKills / n,
      avgDeaths: totalDeaths / n,
      avgAssists: totalAssists / n,
      avgLastHits10: null,
      avgGPM: totalGPM / n,
      avgXPM: totalXPM / n,
      itemTimings,
      typicalBuildOrder,
      startingItems,
      avgDuration: totalDuration / n,
    };
  }

  private deriveTypicalBuildOrder(
    buildOrders: number[][],
    itemTimings: ProItemTiming[]
  ): number[] {
    if (buildOrders.length === 0) return [];

    return itemTimings
      .filter(it => it.purchaseRate >= 0.3)
      .slice(0, 10)
      .map(it => it.itemId);
  }

  private isFinishedCoreItem(itemId: number): boolean {
    const itemInfo = this.stratz.getItemCache().get(itemId);
    if (!itemInfo) return false;

    const name = itemInfo.name.toLowerCase();
    const cost = itemInfo.cost;

    if (name.includes('recipe')) return false;

    const allowedMinorItems = [
      'item_bottle',
      'item_magic_wand',
      'item_boots',
      'item_power_treads',
      'item_phase_boots',
      'item_arcane_boots',
      'item_tranquil_boots',
      'item_ultimate_scepter_2',
      'item_aghanims_shard'
    ];
    if (allowedMinorItems.includes(name)) {
      return true;
    }

    const rawComponents = [
      'belt_of_strength',
      'boots_of_elves',
      'robe',
      'staff_of_wizardry',
      'ogre_axe',
      'blade_of_alacrity',
      'point_booster',
      'vitality_booster',
      'energy_booster',
      'void_stone',
      'ring_of_health',
      'tiara_of_intelligence',
      'diadem',
      'broadsword',
      'blades_of_attack',
      'chainmail',
      'helm_of_iron_will',
      'javelin',
      'mithril_hammer',
      'claymore',
      'quarterstaff',
      'gloves',
      'blitz_knuckles',
      'fluffy_hat',
      'crown',
      'shadow_amulet',
      'ring_of_regen',
      'sobi_mask',
      'lifesteal',
      'magic_stick',
      'wind_lace',
      'circlet',
      'branches',
      'gauntlets',
      'slippers',
      'mantle'
    ];
    if (rawComponents.some(comp => name.includes(comp))) {
      return false;
    }

    const cheapStatItems = ['bracer', 'wraith_band', 'null_talisman'];
    if (cheapStatItems.some(item => name.includes(item))) {
      return false;
    }

    return cost >= 1700;
  }
}
