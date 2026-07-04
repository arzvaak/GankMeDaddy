// ============================================================================
// GankMeDaddy — STRATZ GraphQL Client
// Authenticated client for api.stratz.com/graphql
// ============================================================================

import fetch from 'node-fetch';
import { PLAYER_MATCHES_QUERY, MATCH_DETAILS_QUERY, ITEM_CONSTANTS_QUERY } from './queries';

const STRATZ_GRAPHQL_URL = 'https://api.stratz.com/graphql';
const TOPSON_STEAM_ID = 94054712;

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
  private async query<T = any>(queryStr: string, variables: Record<string, any> = {}): Promise<T> {
    const response = await fetch(STRATZ_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
        'User-Agent': 'STRATZ_API',
      },
      body: JSON.stringify({ query: queryStr, variables }),
    });

    if (!response.ok) {
      throw new Error(`STRATZ API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as any;
    if (json.errors && json.errors.length > 0) {
      const msgs = json.errors.map((e: any) => e.message).join('; ');
      throw new Error(`STRATZ GraphQL errors: ${msgs}`);
    }

    return json.data as T;
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
   * Fetch Topson's recent matches on specific heroes.
   */
  async fetchTopsonMatches(heroIds: number[], take: number = 25): Promise<any> {
    return this.fetchPlayerMatches(TOPSON_STEAM_ID, heroIds, take);
  }

  /**
   * Fetch a single match by ID.
   */
  async fetchMatchDetails(matchId: number): Promise<any> {
    const data = await this.query(MATCH_DETAILS_QUERY, { matchId });
    return data?.match || null;
  }
}
