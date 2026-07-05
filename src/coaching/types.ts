// ============================================================================
// GankMeDaddy — Shared Types for Coaching Engine
// ============================================================================

// ---------------------------------------------------------------------------
// Hero definitions
// ---------------------------------------------------------------------------
export const HERO_IDS = {
  VOID_SPIRIT: 126,
  SNIPER: 35,
  SHADOW_FIEND: 11,
  EMBER_SPIRIT: 106,
  STORM_SPIRIT: 17,
  MONKEY_KING: 114,
  QUEEN_OF_PAIN: 39,
  ZEUS: 22,
  KEZ: 145,
} as const;

export const HERO_NAMES: Record<number, string> = {
  [HERO_IDS.VOID_SPIRIT]: 'Void Spirit',
  [HERO_IDS.SNIPER]: 'Sniper',
  [HERO_IDS.SHADOW_FIEND]: 'Shadow Fiend',
  [HERO_IDS.EMBER_SPIRIT]: 'Ember Spirit',
  [HERO_IDS.STORM_SPIRIT]: 'Storm Spirit',
  [HERO_IDS.MONKEY_KING]: 'Monkey King',
  [HERO_IDS.QUEEN_OF_PAIN]: 'Queen of Pain',
  [HERO_IDS.ZEUS]: 'Zeus',
  [HERO_IDS.KEZ]: 'Kez',
};

export const SUPPORTED_HERO_IDS = Object.values(HERO_IDS) as number[];

// ---------------------------------------------------------------------------
// Topson reference data (fetched from STRATZ)
// ---------------------------------------------------------------------------
export interface TopsonItemTiming {
  itemId: number;
  itemName: string;
  /** Median purchase time in seconds from game start across Topson's recent matches */
  medianTime: number;
  /** Average purchase time in seconds */
  averageTime: number;
  /** Earliest purchase time observed */
  earliestTime: number;
  /** How many matches this item appeared in */
  matchCount: number;
  /** Total matches sampled */
  totalMatches: number;
  /** Purchase rate (matchCount / totalMatches) */
  purchaseRate: number;
}

export interface TopsonHeroProfile {
  heroId: number;
  heroName: string;
  /** Number of matches analyzed */
  matchesAnalyzed: number;
  /** Win rate from analyzed matches */
  winRate: number;
  /** Average kills per match */
  avgKills: number;
  /** Average deaths per match */
  avgDeaths: number;
  /** Average assists per match */
  avgAssists: number;
  /** Average last hits at 10 min (if available) */
  avgLastHits10: number | null;
  /** Average gold per minute */
  avgGPM: number;
  /** Average XP per minute */
  avgXPM: number;
  /** Item timing benchmarks — ordered by median purchase time */
  itemTimings: TopsonItemTiming[];
  /** Most common item build order (item IDs in purchase sequence) */
  typicalBuildOrder: number[];
  /** Most common starting items (item names) */
  startingItems: string[];
  /** Average game duration in seconds */
  avgDuration: number;
}

// ---------------------------------------------------------------------------
// Match snapshot (built from GSI + STRATZ context per tick)
// ---------------------------------------------------------------------------
export type GamePhase = 'laning' | 'midgame' | 'lategame';

export interface PlayerSnapshot {
  gold: number;
  goldReliable: number;
  goldUnreliable: number;
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  denies: number;
  gpm: number;
  xpm: number;
}

export interface HeroSnapshot {
  heroId: number;
  level: number;
  xpos: number;
  ypos: number;
  health: number;
  maxHealth: number;
  healthPercent: number;
  mana: number;
  maxMana: number;
  manaPercent: number;
  alive: boolean;
  respawnSeconds: number;
}

export interface ItemSlot {
  slotIndex: number;
  itemName: string;
  itemId: number;
  charges: number;
  cooldown: number;
  passive: boolean;
}

export interface AbilitySlot {
  abilityName: string;
  level: number;
  canCast: boolean;
  passive: boolean;
  cooldown: number;
  ultimate: boolean;
}

export interface BuildingSnapshot {
  name: string;
  health: number;
  maxHealth: number;
  team: 'radiant' | 'dire';
}

export interface StratzContext {
  topsonProfile: TopsonHeroProfile | null;
  userRecentMatches: number; // how many recent user matches were found for this hero
  userWinRate: number | null;
}

export interface MatchupDraft {
  radiantHeroIds: number[];
  direHeroIds: number[];
  myHeroId: number;
}

export interface MatchSnapshot {
  /** Game time in seconds (includes pre-horn time, can be negative) */
  gameTime: number;
  /** Clock time in seconds (what's shown on the HUD) */
  clockTime: number;
  /** Whether it's daytime */
  isDaytime: boolean;
  /** Derived game phase */
  phase: GamePhase;
  /** Player stats */
  player: PlayerSnapshot;
  /** Hero state */
  hero: HeroSnapshot;
  /** Inventory items */
  items: ItemSlot[];
  /** Hero abilities */
  abilities: AbilitySlot[];
  /** Building states */
  buildings: BuildingSnapshot[];
  /** Pre-fetched STRATZ context for the current hero */
  stratzContext: StratzContext;
  /** Manually configured draft matchup from dashboard */
  matchup?: MatchupDraft | null;
}

// ---------------------------------------------------------------------------
// Coaching output
// ---------------------------------------------------------------------------
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationCategory =
  | 'item'
  | 'aggression'
  | 'rune'
  | 'lotus'
  | 'shrine'
  | 'positioning'
  | 'timing'
  | 'rotation'
  | 'power_spike'
  | 'death'
  | 'farming'
  | 'mana';

export interface CoachingRecommendation {
  priority: RecommendationPriority;
  category: RecommendationCategory;
  /** The text that will be spoken via TTS */
  message: string;
  /** Deduplication key — same key won't fire again within cooldownSeconds */
  cooldownKey: string;
  /** How many seconds before this advice can repeat */
  cooldownSeconds: number;
}

// ---------------------------------------------------------------------------
// Hero strategy interface — each hero module implements this
// ---------------------------------------------------------------------------
export interface HeroStrategy {
  heroId: number;
  heroName: string;
  /**
   * Analyze the current match snapshot and return hero-specific coaching advice.
   * General mid-lane advice (runes, etc.) is handled by the coaching engine itself.
   */
  analyzeSnapshot(snapshot: MatchSnapshot): CoachingRecommendation[];
}
