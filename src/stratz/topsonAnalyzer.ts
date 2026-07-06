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
      let matches = await this.stratz.fetchTopsonMatches([heroId], 15);

      const topsonPlayedMatches = (matches || []).filter((m: any) =>
        m.players?.some((p: any) => p.steamAccountId === TOPSON_STEAM_ID)
      );

      let isGuideMode = false;

      if (topsonPlayedMatches.length < 3) {
        console.log(`[TOPSON] Topson has < 3 valid matches on ${heroName} (${topsonPlayedMatches.length} found). Fetching Pro Guides instead...`);
        const guides = await this.stratz.fetchHeroGuides(heroId, 5);

        if (!guides || guides.length === 0) {
          console.log(`[TOPSON] No Pro Guides or Topson matches found for ${heroName}`);
          return null;
        }

        const matchDetails: any[] = [];
        // Fetch match details in parallel to bypass complexity limits
        await Promise.all(
          guides.map(async (g) => {
            try {
              const m = await this.stratz.fetchMatchDetails(g.matchId);
              if (m) {
                m.guideSteamAccountId = g.steamAccountId; // attach guide player ID
                matchDetails.push(m);
              }
            } catch (err) {
              console.error(`[TOPSON] Failed to fetch guide match ${g.matchId}:`, err);
            }
          })
        );

        if (matchDetails.length === 0) {
          console.log(`[TOPSON] Failed to retrieve details for any guide matches on ${heroName}`);
          return null;
        }

        matches = matchDetails;
        isGuideMode = true;
      }

      const profile = this.buildProfile(heroId, heroName, matches);
      profile.isGuideMode = isGuideMode;
      this.profileCache.set(heroId, profile);

      const modeStr = isGuideMode ? 'Pro Guides' : 'Topson';
      console.log(`[TOPSON] Analyzed ${profile.matchesAnalyzed} matches for ${heroName} (${modeStr} Mode)`);
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
    let totalMatchesWithPlayer = 0;

    const validMatches: any[] = [];

    // First, pass through all matches to compute winrate and average stats
    for (const match of matches) {
      const targetSteamId = match.guideSteamAccountId || TOPSON_STEAM_ID;
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

    // Filter to victory matches only for starting items and item timings
    const victoryMatches = validMatches.filter(m => {
      const targetSteamId = m.guideSteamAccountId || TOPSON_STEAM_ID;
      const p = m.players?.find((pl: any) => pl.steamAccountId === targetSteamId);
      return p && p.isVictory;
    });
    // Fall back to all valid matches if there are no wins in the sample
    const itemAnalysisMatches = victoryMatches.length > 0 ? victoryMatches : validMatches;

    // Collect all item purchases across matches
    const itemPurchasesByItem: Map<number, number[]> = new Map(); // itemId → [time1, time2, ...]
    const buildOrders: number[][] = [];
    const startingItemCounts: Map<number, number> = new Map(); // itemId → count

    for (const match of itemAnalysisMatches) {
      const targetSteamId = match.guideSteamAccountId || TOPSON_STEAM_ID;
      const player = match.players?.find(
        (p: any) => p.steamAccountId === targetSteamId
      );
      if (!player) continue;

      // Extract item purchases with timings
      const purchases = player.stats?.itemPurchases;
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
        totalMatches: itemAnalysisMatches.length,
        purchaseRate: times.length / itemAnalysisMatches.length,
      });
    }

    // Sort by median purchase time (earliest items first)
    itemTimings.sort((a, b) => a.medianTime - b.medianTime);

    // Derive typical build order from most common sequence
    const typicalBuildOrder = this.deriveTypicalBuildOrder(buildOrders, itemTimings);

    // Format starting items (those bought in at least 30% of games)
    const startingItems: string[] = [];
    const minMatchesForStartingItem = Math.max(1, Math.round(itemAnalysisMatches.length * 0.3));

    // Sort starting items by frequency
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
      matchesAnalyzed: totalMatchesWithPlayer,
      winRate,
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
