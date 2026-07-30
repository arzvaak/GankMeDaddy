import { DOTA_HEROES } from './heroesData';

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
  CRYSTAL_MAIDEN: 5,
  LICH: 31,
  WITCH_DOCTOR: 30,
  WARLOCK: 37,
  DISRUPTOR: 87,
  DAZZLE: 50,
  SHADOW_SHAMAN: 27,
  JAKIRO: 64,
  ORACLE: 111,
  RUBICK: 86,
  LION: 26,
  HOODWINK: 123,
  EARTH_SPIRIT: 107,
  TUSK: 100,
  PHOENIX: 110,
  NYX_ASSASSIN: 88,
  CLOCKWERK: 51,
  AXE: 2,
  TIDEHUNTER: 29,
  SAND_KING: 16,
  CENTAUR: 96,
  MARS: 129,
  DAWNBREAKER: 135,
  PRIMAL_BEAST: 137,
  PHANTOM_ASSASSIN: 44,
  FACELESS_VOID: 41,
  SPECTRE: 67,
  LUNA: 48,
  JUGGERNAUT: 8,
  MORPHLING: 10,
  TROLL_WARLORD: 95,
} as const;

export type Role = 'mid' | 'pos1' | 'pos3' | 'pos4' | 'pos5';

export const HERO_ROLES: Partial<Record<number, Role>> = {
  // Mid heroes
  [HERO_IDS.VOID_SPIRIT]: 'mid',
  [HERO_IDS.SNIPER]: 'mid',
  [HERO_IDS.SHADOW_FIEND]: 'mid',
  [HERO_IDS.EMBER_SPIRIT]: 'mid',
  [HERO_IDS.STORM_SPIRIT]: 'mid',
  [HERO_IDS.MONKEY_KING]: 'mid',
  [HERO_IDS.QUEEN_OF_PAIN]: 'mid',
  [HERO_IDS.ZEUS]: 'mid',
  [HERO_IDS.KEZ]: 'mid',
  // Pos 5 (hard support)
  [HERO_IDS.CRYSTAL_MAIDEN]: 'pos5',
  [HERO_IDS.LICH]: 'pos5',
  [HERO_IDS.WITCH_DOCTOR]: 'pos5',
  [HERO_IDS.WARLOCK]: 'pos5',
  [HERO_IDS.DISRUPTOR]: 'pos5',
  [HERO_IDS.DAZZLE]: 'pos5',
  [HERO_IDS.SHADOW_SHAMAN]: 'pos5',
  [HERO_IDS.JAKIRO]: 'pos5',
  [HERO_IDS.ORACLE]: 'pos5',
  // Pos 4 (soft support)
  [HERO_IDS.RUBICK]: 'pos4',
  [HERO_IDS.LION]: 'pos4',
  [HERO_IDS.HOODWINK]: 'pos4',
  [HERO_IDS.EARTH_SPIRIT]: 'pos4',
  [HERO_IDS.TUSK]: 'pos4',
  [HERO_IDS.PHOENIX]: 'pos4',
  [HERO_IDS.NYX_ASSASSIN]: 'pos4',
  [HERO_IDS.CLOCKWERK]: 'pos4',
  // Pos 3 (offlane)
  [HERO_IDS.AXE]: 'pos3',
  [HERO_IDS.TIDEHUNTER]: 'pos3',
  [HERO_IDS.SAND_KING]: 'pos3',
  [HERO_IDS.CENTAUR]: 'pos3',
  [HERO_IDS.MARS]: 'pos3',
  [HERO_IDS.DAWNBREAKER]: 'pos3',
  [HERO_IDS.PRIMAL_BEAST]: 'pos3',
  // Pos 1 (safelane carry)
  [HERO_IDS.PHANTOM_ASSASSIN]: 'pos1',
  [HERO_IDS.FACELESS_VOID]: 'pos1',
  [HERO_IDS.SPECTRE]: 'pos1',
  [HERO_IDS.LUNA]: 'pos1',
  [HERO_IDS.JUGGERNAUT]: 'pos1',
  [HERO_IDS.MORPHLING]: 'pos1',
  [HERO_IDS.TROLL_WARLORD]: 'pos1',
};

export const HERO_NAMES: Record<number, string> = {};
for (const h of DOTA_HEROES) {
  HERO_NAMES[h.id] = h.name;
}

export const SUPPORTED_HERO_IDS = Object.values(HERO_IDS) as number[];

export const ROLE_PRO_PLAYERS: Record<Role, number> = {
  pos1: 321580662,
  mid: 94054712,
  pos3: 302214028,
  pos4: 157475523,
  pos5: 113331514,
};

// ---------------------------------------------------------------------------
// Pro player reference data (fetched from STRATZ)
// ---------------------------------------------------------------------------
export interface ProItemTiming {
  itemId: number;
  itemName: string;
  /** Median purchase time in seconds from game start across pro matches */
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

export interface ProHeroProfile {
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
  itemTimings: ProItemTiming[];
  /** Most common item build order (item IDs in purchase sequence) */
  typicalBuildOrder: number[];
  /** Most common starting items (item names) */
  startingItems: string[];
  /** Average game duration in seconds */
  avgDuration: number;
  /** Whether this profile was compiled from STRATZ Pro Guides fallback */
  isGuideMode?: boolean;
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
  team: 'radiant' | 'dire';
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
  proProfile: ProHeroProfile | null;
  userRecentMatches: number; // how many recent user matches were found for this hero
  userWinRate: number | null;
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
  /** Detected role (mid, pos4, pos5) based on hero */
  role: Role;
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
  | 'mana'
  | 'warding'
  | 'stacking'
  | 'save';

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
   * General role-based advice (runes, wards, etc.) is handled by the coaching engine itself.
   */
  analyzeSnapshot(snapshot: MatchSnapshot): CoachingRecommendation[];
}
