// Vendored MDT dungeon enemy tables for the 8 current-season dungeons.
// Source: https://github.com/acornellier/threechest (src/data/mdtDungeons/*.json)
// Licensed under threechest's MIT license. Refresh these JSON files when
// the M+ season rotates alongside src/data/currentSeason.ts.
//
// Each JSON file has the shape:
//   { dungeonIndex: number, totalCount: number, enemies: MdtDungeonEnemy[] }
// where `dungeonIndex` matches `value.currentDungeonIdx` in an MDT route.

import type { MdtDungeonTable, MdtDungeonEnemy } from '../types';

import aa from './aa_mdt.json';
import magi from './magi_mdt.json';
import cavns from './cavns_mdt.json';
import xenas from './xenas_mdt.json';
import wind from './wind_mdt.json';
import pit from './pit_mdt.json';
import seat from './seat_mdt.json';
import sky from './sky_mdt.json';

// Raw JSON shape (extra fields exist but we only use these).
interface RawDungeon {
  dungeonIndex: number;
  totalCount: number;
  enemies: MdtDungeonEnemy[];
}

function build(
  raw: RawDungeon,
  instanceSlug: string,
  displayName: string,
  mapKey: string,
): MdtDungeonTable {
  return {
    dungeonIndex: raw.dungeonIndex,
    totalCount: raw.totalCount,
    instanceSlug,
    displayName,
    mapKey,
    enemies: raw.enemies,
  };
}

// instanceSlug values come from src/data/currentSeason.ts (Midnight S1).
// mapKey values match the directory names under /public/maps/.
export const MDT_DUNGEONS: MdtDungeonTable[] = [
  build(magi as RawDungeon, 'magisters-terrace', "Magister's Terrace", 'magi'),
  build(cavns as RawDungeon, 'maisara-caverns', 'Maisara Caverns', 'cavns'),
  build(xenas as RawDungeon, 'nexus-point-xenas', 'Nexus-Point Xenas', 'xenas'),
  build(wind as RawDungeon, 'windrunner-spire', 'Windrunner Spire', 'wind'),
  build(pit as RawDungeon, 'pit-of-saron', 'Pit of Saron', 'pit'),
  build(sky as RawDungeon, 'skyreach', 'Skyreach', 'sky'),
  build(seat as RawDungeon, 'seat-of-the-triumvirate', 'Seat of the Triumvirate', 'seat'),
  build(aa as RawDungeon, 'algethar-academy', "Algeth'ar Academy", 'aa'),
];

const BY_MDT_INDEX = new Map<number, MdtDungeonTable>();
for (const d of MDT_DUNGEONS) BY_MDT_INDEX.set(d.dungeonIndex, d);

export function findDungeonByMdtIdx(idx: number | undefined): MdtDungeonTable | undefined {
  if (idx == null) return undefined;
  return BY_MDT_INDEX.get(idx);
}
