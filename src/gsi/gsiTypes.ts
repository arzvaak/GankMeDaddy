// ============================================================================
// GankMeDaddy — GSI Type Definitions
// Full TypeScript interfaces for Dota 2 Game State Integration JSON payloads
// ============================================================================

export interface GSIProvider {
  name: string;
  appid: number;
  version: number;
  timestamp: number;
}

export interface GSIMap {
  name: string;
  matchid: string;
  game_time: number;
  clock_time: number;
  daytime: boolean;
  nightstalker_night: boolean;
  game_state: 'DOTA_GAMERULES_STATE_INIT'
    | 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD'
    | 'DOTA_GAMERULES_STATE_HERO_SELECTION'
    | 'DOTA_GAMERULES_STATE_STRATEGY_TIME'
    | 'DOTA_GAMERULES_STATE_PRE_GAME'
    | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS'
    | 'DOTA_GAMERULES_STATE_POST_GAME'
    | string;
  paused: boolean;
  win_team: string;
  customgamename: string;
  ward_purchase_cooldown: number;
}

export interface GSIPlayer {
  steamid: string;
  accountid: string;
  name: string;
  activity: string;
  kills: number;
  deaths: number;
  assists: number;
  last_hits: number;
  denies: number;
  kill_streak: number;
  commands_issued: number;
  kill_list: Record<string, number>;
  team_name: string;
  gold: number;
  gold_reliable: number;
  gold_unreliable: number;
  gold_from_hero_kills: number;
  gold_from_creep_kills: number;
  gold_from_income: number;
  gold_from_shared: number;
  gpm: number;
  xpm: number;
}

export interface GSIHero {
  xpos: number;
  ypos: number;
  id: number;
  name: string;
  level: number;
  xp: number;
  alive: boolean;
  respawn_seconds: number;
  buyback_cost: number;
  buyback_cooldown: number;
  health: number;
  max_health: number;
  health_percent: number;
  mana: number;
  max_mana: number;
  mana_percent: number;
  silenced: boolean;
  stunned: boolean;
  disarmed: boolean;
  magicimmune: boolean;
  hexed: boolean;
  muted: boolean;
  break_: boolean;
  aghanims_scepter: boolean;
  aghanims_shard: boolean;
  smoked: boolean;
  has_debuff: boolean;
  talent_1: boolean;
  talent_2: boolean;
  talent_3: boolean;
  talent_4: boolean;
  talent_5: boolean;
  talent_6: boolean;
  talent_7: boolean;
  talent_8: boolean;
}

export interface GSIItemSlot {
  name: string;
  purchaser: number;
  item_level: number;
  contains_rune?: string;
  can_cast?: boolean;
  cooldown?: number;
  passive?: boolean;
  charges?: number;
}

export interface GSIItems {
  slot0: GSIItemSlot;
  slot1: GSIItemSlot;
  slot2: GSIItemSlot;
  slot3: GSIItemSlot;
  slot4: GSIItemSlot;
  slot5: GSIItemSlot;
  stash0: GSIItemSlot;
  stash1: GSIItemSlot;
  stash2: GSIItemSlot;
  stash3: GSIItemSlot;
  stash4: GSIItemSlot;
  stash5: GSIItemSlot;
  teleport0: GSIItemSlot;
  neutral0: GSIItemSlot;
  [key: string]: GSIItemSlot | undefined;
}

export interface GSIAbility {
  name: string;
  level: number;
  can_cast: boolean;
  passive: boolean;
  ability_active: boolean;
  cooldown: number;
  ultimate: boolean;
}

export interface GSIAbilities {
  [key: string]: GSIAbility;
}

export interface GSIBuilding {
  health: number;
  max_health: number;
}

export interface GSIBuildings {
  radiant?: Record<string, GSIBuilding>;
  dire?: Record<string, GSIBuilding>;
}

/**
 * Complete Game State payload from Dota 2 GSI.
 * When playing (not spectating), only local player data is available.
 */
export interface GameState {
  provider?: GSIProvider;
  map?: GSIMap;
  player?: GSIPlayer;
  hero?: GSIHero;
  abilities?: GSIAbilities;
  items?: GSIItems;
  buildings?: GSIBuildings;
  previously?: Partial<GameState>;
  added?: Partial<GameState>;
}
