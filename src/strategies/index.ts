// ============================================================================
// GankMeDaddy — Strategy Registry
// Maps hero IDs to their strategy modules. Add new heroes here.
// ============================================================================

import { HeroStrategy, HERO_IDS } from '../coaching/types';
import { voidSpiritStrategy } from './voidSpiritStrategy';
import { sniperStrategy } from './sniperStrategy';
import { shadowFiendStrategy } from './shadowFiendStrategy';
import { emberSpiritStrategy } from './emberSpiritStrategy';
import { stormSpiritStrategy } from './stormSpiritStrategy';
import { monkeyKingStrategy } from './monkeyKingStrategy';
import { queenOfPainStrategy } from './queenOfPainStrategy';
import { zeusStrategy } from './zeusStrategy';

/**
 * Registry of all hero-specific strategy modules.
 * To add a new hero:
 *   1. Create a new xxxStrategy.ts implementing HeroStrategy
 *   2. Import it here
 *   3. Register it with strategyRegistry.set(HERO_IDS.XXX, xxxStrategy)
 */
export const strategyRegistry = new Map<number, HeroStrategy>();

strategyRegistry.set(HERO_IDS.VOID_SPIRIT, voidSpiritStrategy);
strategyRegistry.set(HERO_IDS.SNIPER, sniperStrategy);
strategyRegistry.set(HERO_IDS.SHADOW_FIEND, shadowFiendStrategy);
strategyRegistry.set(HERO_IDS.EMBER_SPIRIT, emberSpiritStrategy);
strategyRegistry.set(HERO_IDS.STORM_SPIRIT, stormSpiritStrategy);
strategyRegistry.set(HERO_IDS.MONKEY_KING, monkeyKingStrategy);
strategyRegistry.set(HERO_IDS.QUEEN_OF_PAIN, queenOfPainStrategy);
strategyRegistry.set(HERO_IDS.ZEUS, zeusStrategy);

console.log(`[STRATEGIES] Registered ${strategyRegistry.size} hero strategies`);
