// ============================================================================
// GankMeDaddy — Topson Data Analyzer
// Fetches and analyzes Topson's real match data from STRATZ to derive
// item timing benchmarks, KDA patterns, and playstyle metrics per hero.
// ============================================================================

import { StratzClient } from './stratzClient';
import {
  TopsonHeroProfile,
  TopsonItemTiming,
  HERO_NAMES,
  SUPPORTED_HERO_IDS,
} from '../coaching/types';

const TOPSON_STEAM_ID = 94054712;

/**
 * Analyzes Topson's actual STRATZ match data to build coaching benchmarks.
 */
export class TopsonAnalyzer {
  private stratz: StratzClient;
  private profileCache: Map<number, TopsonHeroProfile> = new Map();

  constructor(stratz: StratzClient) {
    this.stratz = stratz;
  }

  /**
   * Fetch and analyze Topson's matches for a specific hero.
   * Caches the result for the session.
   */
  async analyzeHero(heroId: number, take: number = 25): Promise<TopsonHeroProfile | null> {
    // Return cached if available
    if (this.profileCache.has(heroId)) {
      return this.profileCache.get(heroId)!;
    }

    const heroName = HERO_NAMES[heroId] || `Hero ${heroId}`;
    console.log(`[TOPSON] Fetching ${heroName} match data from STRATZ...`);

    try {
      const matches = await this.stratz.fetchPlayerMatches(TOPSON_STEAM_ID, [heroId], take);

      if (!matches || matches.length === 0) {
        console.log(`[TOPSON] No parsed matches found for ${heroName}`);
        return null;
      }

      const profile = this.buildProfile(heroId, heroName, matches);
      this.profileCache.set(heroId, profile);

      console.log(`[TOPSON] Analyzed ${profile.matchesAnalyzed} matches for ${heroName}`);
      console.log(`[TOPSON]   Win rate: ${(profile.winRate * 100).toFixed(1)}%`);
      console.log(`[TOPSON]   Avg KDA: ${profile.avgKills.toFixed(1)}/${profile.avgDeaths.toFixed(1)}/${profile.avgAssists.toFixed(1)}`);
      console.log(`[TOPSON]   Avg GPM: ${profile.avgGPM.toFixed(0)}, XPM: ${profile.avgXPM.toFixed(0)}`);
      if (profile.startingItems.length > 0) {
        console.log(`[TOPSON]   Usual starting items: ${profile.startingItems.join(', ')}`);
      }
      if (profile.itemTimings.length > 0) {
        console.log(`[TOPSON]   Key item timings:`);
        for (const it of profile.itemTimings.slice(0, 8)) {
          const mins = Math.floor(it.medianTime / 60);
          const secs = Math.floor(it.medianTime % 60);
          console.log(`[TOPSON]     ${it.itemName}: ~${mins}:${secs.toString().padStart(2, '0')} (${(it.purchaseRate * 100).toFixed(0)}% of games)`);
        }
      }

      return profile;
    } catch (err) {
      console.error(`[TOPSON] Failed to analyze ${heroName}:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Pre-fetch all supported heroes. Called at startup.
   */
  async preloadAllHeroes(heroIds?: number[]): Promise<void> {
    const ids = heroIds || SUPPORTED_HERO_IDS;
    console.log(`[TOPSON] Pre-loading data for ${ids.length} heroes...`);

    for (const heroId of ids) {
      await this.analyzeHero(heroId);
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[TOPSON] Pre-load complete. Cached ${this.profileCache.size} hero profiles.`);
  }

  /**
   * Get cached profile for a hero (returns null if not yet loaded).
   */
  getProfile(heroId: number): TopsonHeroProfile | null {
    return this.profileCache.get(heroId) || null;
  }

  // -------------------------------------------------------------------------
  // Private analysis methods
  // -------------------------------------------------------------------------

  private buildProfile(heroId: number, heroName: string, matches: any[]): TopsonHeroProfile {
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalGPM = 0, totalXPM = 0, totalDuration = 0;
    let wins = 0;

    // Filter to victory matches only, falling back to all matches if no wins are present
    const victoryMatches = matches.filter(m => {
      const p = m.players?.find((pl: any) => pl.steamAccountId === TOPSON_STEAM_ID);
      return p && p.isVictory;
    });
    const targetMatches = victoryMatches.length > 0 ? victoryMatches : matches;

    const validMatches: any[] = [];

    // Collect all item purchases across matches
    const itemPurchasesByItem: Map<number, number[]> = new Map(); // itemId → [time1, time2, ...]
    const buildOrders: number[][] = [];
    const startingItemCounts: Map<number, number> = new Map(); // itemId → count

    for (const match of targetMatches) {
      // Find Topson's player entry
      const topsonPlayer = match.players?.find(
        (p: any) => p.steamAccountId === TOPSON_STEAM_ID
      );
      if (!topsonPlayer) continue;

      validMatches.push(match);
      totalKills += topsonPlayer.kills || 0;
      totalDeaths += topsonPlayer.deaths || 0;
      totalAssists += topsonPlayer.assists || 0;
      totalGPM += topsonPlayer.goldPerMinute || 0;
      totalXPM += topsonPlayer.experiencePerMinute || 0;
      totalDuration += match.durationSeconds || 0;
      if (topsonPlayer.isVictory) wins++;

      // Extract item purchases with timings
      const purchases = topsonPlayer.stats?.itemPurchases;
      if (Array.isArray(purchases)) {
        const matchBuildOrder: number[] = [];

        for (const purchase of purchases) {
          if (!purchase.itemId || purchase.time == null) continue;

          // Track starting items (time <= 0)
          if (purchase.time <= 0) {
            startingItemCounts.set(purchase.itemId, (startingItemCounts.get(purchase.itemId) || 0) + 1);
          }

          // Focus exclusively on major finished core items
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

    const n = validMatches.length || 1;

    // Build item timing benchmarks
    const itemTimings: TopsonItemTiming[] = [];
    for (const [itemId, times] of itemPurchasesByItem.entries()) {
      if (times.length < 2) continue; // Need at least 2 data points

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
        totalMatches: validMatches.length,
        purchaseRate: times.length / validMatches.length,
      });
    }

    // Sort by median purchase time (earliest items first)
    itemTimings.sort((a, b) => a.medianTime - b.medianTime);

    // Derive typical build order from most common sequence
    const typicalBuildOrder = this.deriveTypicalBuildOrder(buildOrders, itemTimings);

    // Format starting items (those bought in at least 30% of games)
    const startingItems: string[] = [];
    const minMatchesForStartingItem = Math.max(1, Math.round(validMatches.length * 0.3));

    // Sort starting items by frequency
    const sortedStartingItems = Array.from(startingItemCounts.entries())
      .filter(([_, count]) => count >= minMatchesForStartingItem)
      .sort((a, b) => b[1] - a[1]);

    for (const [itemId, count] of sortedStartingItems) {
      const displayName = this.stratz.getItemName(itemId);
      if (displayName && displayName !== `Item #${itemId}`) {
        const avgCount = Math.round(count / validMatches.length);
        let name = displayName;
        if (avgCount > 1) {
          if (name.toLowerCase().includes('branch')) {
            name = `${name}es`; // Iron Branches
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
      matchesAnalyzed: validMatches.length,
      winRate: wins / n,
      avgKills: totalKills / n,
      avgDeaths: totalDeaths / n,
      avgAssists: totalAssists / n,
      avgLastHits10: null, // Would need per-minute breakdowns
      avgGPM: totalGPM / n,
      avgXPM: totalXPM / n,
      itemTimings,
      typicalBuildOrder,
      startingItems,
      avgDuration: totalDuration / n,
    };
  }

  /**
   * Derive the most typical build order by frequency analysis.
   * Returns the most common first N items across all build orders.
   */
  private deriveTypicalBuildOrder(
    buildOrders: number[][],
    itemTimings: TopsonItemTiming[]
  ): number[] {
    if (buildOrders.length === 0) return [];

    // Use item timings sorted by median time — items bought >30% of the time
    return itemTimings
      .filter(it => it.purchaseRate >= 0.3)
      .slice(0, 10) // Top 10 most consistent items
      .map(it => it.itemId);
  }

  /**
   * Determine if an item is a finished core item (skipping recipes and raw components).
   */
  private isFinishedCoreItem(itemId: number): boolean {
    const itemInfo = this.stratz.getItemCache().get(itemId);
    if (!itemInfo) return false;

    const name = itemInfo.name.toLowerCase();
    const cost = itemInfo.cost;

    // 1. Skip recipes
    if (name.includes('recipe')) return false;

    // 2. Allowed minor finished items
    const allowedMinorItems = [
      'bottle',
      'magic_wand',
      'boots',
      'power_treads',
      'phase_boots',
      'arcane_boots',
      'tranquil_boots',
      'ultimate_scepter_2',
      'aghanims_shard'
    ];
    if (allowedMinorItems.some(i => name.includes(i))) {
      return true;
    }

    // 3. Exclude raw components
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

    // 4. Exclude early game cheap stat items (Bracer, Wraith Band, Null Talisman)
    const cheapStatItems = ['bracer', 'wraith_band', 'null_talisman'];
    if (cheapStatItems.some(item => name.includes(item))) {
      return false;
    }

    // 5. Must cost at least 1700 gold to be considered a major core item
    return cost >= 1700;
  }
}
