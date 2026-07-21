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
import { kezStrategy } from './kezStrategy';
import { crystalMaidenStrategy } from './crystalMaidenStrategy';
import { lichStrategy } from './lichStrategy';
import { witchDoctorStrategy } from './witchDoctorStrategy';
import { warlockStrategy } from './warlockStrategy';
import { rubickStrategy } from './rubickStrategy';
import { lionStrategy } from './lionStrategy';
import { hoodwinkStrategy } from './hoodwinkStrategy';
import { earthSpiritStrategy } from './earthSpiritStrategy';
import { tuskStrategy } from './tuskStrategy';
import { axeStrategy } from './axeStrategy';
import { tidehunterStrategy } from './tidehunterStrategy';
import { sandKingStrategy } from './sandKingStrategy';
import { centaurStrategy } from './centaurStrategy';
import { marsStrategy } from './marsStrategy';
import { dawnbreakerStrategy } from './dawnbreakerStrategy';
import { primalBeastStrategy } from './primalBeastStrategy';
import { phantomAssassinStrategy } from './phantomAssassinStrategy';
import { facelessVoidStrategy } from './facelessVoidStrategy';
import { spectreStrategy } from './spectreStrategy';
import { lunaStrategy } from './lunaStrategy';
import { juggernautStrategy } from './juggernautStrategy';
import { morphlingStrategy } from './morphlingStrategy';
import { trollWarlordStrategy } from './trollWarlordStrategy';

export const strategyRegistry = new Map<number, HeroStrategy>();

strategyRegistry.set(HERO_IDS.VOID_SPIRIT, voidSpiritStrategy);
strategyRegistry.set(HERO_IDS.SNIPER, sniperStrategy);
strategyRegistry.set(HERO_IDS.SHADOW_FIEND, shadowFiendStrategy);
strategyRegistry.set(HERO_IDS.EMBER_SPIRIT, emberSpiritStrategy);
strategyRegistry.set(HERO_IDS.STORM_SPIRIT, stormSpiritStrategy);
strategyRegistry.set(HERO_IDS.MONKEY_KING, monkeyKingStrategy);
strategyRegistry.set(HERO_IDS.QUEEN_OF_PAIN, queenOfPainStrategy);
strategyRegistry.set(HERO_IDS.ZEUS, zeusStrategy);
strategyRegistry.set(HERO_IDS.KEZ, kezStrategy);
// Pos 5 (hard support)
strategyRegistry.set(HERO_IDS.CRYSTAL_MAIDEN, crystalMaidenStrategy);
strategyRegistry.set(HERO_IDS.LICH, lichStrategy);
strategyRegistry.set(HERO_IDS.WITCH_DOCTOR, witchDoctorStrategy);
strategyRegistry.set(HERO_IDS.WARLOCK, warlockStrategy);
// Pos 4 (soft support)
strategyRegistry.set(HERO_IDS.RUBICK, rubickStrategy);
strategyRegistry.set(HERO_IDS.LION, lionStrategy);
strategyRegistry.set(HERO_IDS.HOODWINK, hoodwinkStrategy);
strategyRegistry.set(HERO_IDS.EARTH_SPIRIT, earthSpiritStrategy);
strategyRegistry.set(HERO_IDS.TUSK, tuskStrategy);
// Pos 3 (offlane)
strategyRegistry.set(HERO_IDS.AXE, axeStrategy);
strategyRegistry.set(HERO_IDS.TIDEHUNTER, tidehunterStrategy);
strategyRegistry.set(HERO_IDS.SAND_KING, sandKingStrategy);
strategyRegistry.set(HERO_IDS.CENTAUR, centaurStrategy);
strategyRegistry.set(HERO_IDS.MARS, marsStrategy);
strategyRegistry.set(HERO_IDS.DAWNBREAKER, dawnbreakerStrategy);
strategyRegistry.set(HERO_IDS.PRIMAL_BEAST, primalBeastStrategy);
// Pos 1 (safelane carry)
strategyRegistry.set(HERO_IDS.PHANTOM_ASSASSIN, phantomAssassinStrategy);
strategyRegistry.set(HERO_IDS.FACELESS_VOID, facelessVoidStrategy);
strategyRegistry.set(HERO_IDS.SPECTRE, spectreStrategy);
strategyRegistry.set(HERO_IDS.LUNA, lunaStrategy);
strategyRegistry.set(HERO_IDS.JUGGERNAUT, juggernautStrategy);
strategyRegistry.set(HERO_IDS.MORPHLING, morphlingStrategy);
strategyRegistry.set(HERO_IDS.TROLL_WARLORD, trollWarlordStrategy);
