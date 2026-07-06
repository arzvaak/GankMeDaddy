// ============================================================================
// GankMeDaddy — STRATZ GraphQL Query Definitions
// ============================================================================

/**
 * Fetch a player's recent matches filtered by hero IDs.
 * Returns item purchase timings, KDA, GPM/XPM, duration, and win status.
 */
export const PLAYER_MATCHES_QUERY = `
query PlayerMatches($steamAccountId: Long!, $heroIds: [Short!], $take: Int) {
  player(steamAccountId: $steamAccountId) {
    steamAccountId
    matches(
      request: {
        heroIds: $heroIds
        take: $take
        orderBy: DESC
        isParsed: true
        lobbyTypeIds: [7, 1, 2]
      }
    ) {
      id
      durationSeconds
      didRadiantWin
      startDateTime
      gameMode
      players(steamAccountId: $steamAccountId) {
        steamAccountId
        heroId
        isRadiant
        isVictory
        kills
        deaths
        assists
        networth
        goldPerMinute
        experiencePerMinute
        numLastHits
        numDenies
        level
        lane
        role
        imp
        award
        stats {
          itemPurchases {
            itemId
            time
          }
          goldPerMinute
          experiencePerMinute
          lastHitsPerMinute
          killEvents {
            time
            target
          }
          deathEvents {
            time
          }
          assistEvents {
            time
          }
        }
      }
    }
  }
}
`;

/**
 * Fetch a single match in full detail.
 */
export const MATCH_DETAILS_QUERY = `
query MatchDetails($matchId: Long!) {
  match(id: $matchId) {
    id
    durationSeconds
    didRadiantWin
    startDateTime
    gameMode
    players {
      steamAccountId
      heroId
      isRadiant
      isVictory
      kills
      deaths
      assists
      networth
      goldPerMinute
      experiencePerMinute
      numLastHits
      numDenies
      level
      lane
      role
      stats {
        itemPurchases {
          itemId
          time
        }
        goldPerMinute
        experiencePerMinute
        lastHitsPerMinute
      }
    }
  }
}
`;

/**
 * Fetch hero win rate stats and item popularity from STRATZ constants.
 */
export const HERO_STATS_QUERY = `
query HeroStats($heroId: Short!) {
  constants {
    hero(id: $heroId) {
      id
      name
      displayName
      shortName
      stats {
        attackType
        primaryAttribute
        moveSpeed
        startingArmor
      }
    }
  }
}
`;

/**
 * Fetch item constants for resolving item IDs to names.
 */
export const ITEM_CONSTANTS_QUERY = `
query ItemConstants {
  constants {
    items {
      id
      name
      displayName
      shortName
      stat {
        cost
      }
    }
  }
}
`;

/**
 * Fetch recent guide matches for a specific hero.
 */
export const HERO_GUIDES_QUERY = `
query GetHeroGuides($heroId: Short!, $take: Int) {
  heroStats {
    guide(heroId: $heroId, take: $take) {
      guides {
        matchId
        steamAccountId
      }
    }
  }
}
`;
