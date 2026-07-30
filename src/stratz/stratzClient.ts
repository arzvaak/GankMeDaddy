// ============================================================================
// GankMeDaddy — STRATZ GraphQL Client
// Authenticated client for api.stratz.com/graphql
// ============================================================================

import fetch from 'node-fetch';
import { PLAYER_MATCHES_QUERY, MATCH_DETAILS_QUERY, ITEM_CONSTANTS_QUERY, HERO_GUIDES_QUERY } from './queries';

const STRATZ_GRAPHQL_URL = 'https://api.stratz.com/graphql';
export const PRO_STEAM_ID = 94054712;

export interface StratzClientOptions {
  apiToken: string;
}

export class StratzClient {
  private apiToken: string;
  private itemCache: Map<number, { name: string; displayName: string; cost: number }> = new Map();

  constructor(options: StratzClientOptions) {
    this.apiToken = options.apiToken;
  }

  /**
   * Execute a GraphQL query against STRATZ API.
   */
  private async query<T = any>(
    queryStr: string,
    variables: Record<string, any> = {},
    retries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

      try {
        const response = await fetch(STRATZ_GRAPHQL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiToken}`,
            'User-Agent': 'STRATZ_API',
          },
          body: JSON.stringify({ query: queryStr, variables }),
          signal: controller.signal as any,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`STRATZ API error: ${response.status} ${response.statusText}`);
        }

        const json = await response.json() as any;
        if (json.errors && json.errors.length > 0) {
          const msgs = json.errors.map((e: any) => e.message).join('; ');
          throw new Error(`STRATZ GraphQL errors: ${msgs}`);
        }

        return json.data as T;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isAbort = err.name === 'AbortError';
        console.warn(`[STRATZ] Query attempt ${attempt} failed (Timeout: ${isAbort}): ${err.message}`);
        if (attempt === retries) {
          throw err;
        }
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
    throw new Error('STRATZ query failed after all retry attempts');
  }

  /**
   * Load item constants (ID → name mapping). Cached after first call.
   */
  async loadItemConstants(): Promise<void> {
    if (this.itemCache.size > 0) return;

    try {
      const data = await this.query(ITEM_CONSTANTS_QUERY);
      const items = data?.constants?.items;
      if (Array.isArray(items)) {
        for (const item of items) {
          this.itemCache.set(item.id, {
            name: item.name || item.shortName || `item_${item.id}`,
            displayName: item.displayName || item.name || `Item ${item.id}`,
            cost: item.stat?.cost || 0,
          });
        }
      }
      console.log(`[STRATZ] Loaded ${this.itemCache.size} item definitions`);
    } catch (err) {
      console.warn('[STRATZ] Failed to load item constants, will use IDs only:', (err as Error).message);
    }
  }

  /**
   * Resolve an item ID to its display name.
   */
  getItemName(itemId: number): string {
    return this.itemCache.get(itemId)?.displayName || `Item #${itemId}`;
  }

  /**
   * Get the full item cache for external use.
   */
  getItemCache(): Map<number, { name: string; displayName: string; cost: number }> {
    return this.itemCache;
  }

  /**
   * Fetch a player's recent matches on specific heroes.
   * Returns raw STRATZ response data.
   */
  async fetchPlayerMatches(
    steamAccountId: number,
    heroIds: number[],
    take: number = 25
  ): Promise<any> {
    const data = await this.query(PLAYER_MATCHES_QUERY, {
      steamAccountId,
      heroIds: heroIds.map(id => id), // Short type in GraphQL
      take,
    });
    return data?.player?.matches || [];
  }

  /**
   * Fetch pro player's recent matches on specific heroes.
   */
  async fetchProMatches(steamAccountId: number, heroIds: number[], take: number = 25): Promise<any> {
    return this.fetchPlayerMatches(steamAccountId, heroIds, take);
  }

  /**
   * Fetch a single match by ID.
   */
  async fetchMatchDetails(matchId: number): Promise<any> {
    const data = await this.query(MATCH_DETAILS_QUERY, { matchId });
    return data?.match || null;
  }

  /**
   * Fetch recent guide matches for a specific hero.
   * Returns list of { matchId: number, steamAccountId: number }
   */
  async fetchHeroGuides(heroId: number, take: number = 5): Promise<any[]> {
    const data = await this.query(HERO_GUIDES_QUERY, { heroId, take });
    return data?.heroStats?.guide?.[0]?.guides || [];
  }
}
