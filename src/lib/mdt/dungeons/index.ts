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

const ENEMIES_BY_SLUG = new Map<string, Map<number, MdtDungeonEnemy>>();
for (const d of MDT_DUNGEONS) {
  const byId = new Map<number, MdtDungeonEnemy>();
  for (const e of d.enemies) {
    // Prefer the first entry with non-zero count so duplicate (summoned-copy)
    // rows with count=0 don't shadow the real dungeon-forces entry.
    const existing = byId.get(e.id);
    if (!existing || (existing.count === 0 && e.count > 0)) byId.set(e.id, e);
  }
  ENEMIES_BY_SLUG.set(d.instanceSlug, byId);
}

// Median non-boss scale per dungeon. MDT's scale values aren't comparable across
// dungeons — Skyreach's data uses 1.8 as the baseline while most dungeons sit
// around 1.0 — so miniboss detection compares against this per-dungeon baseline.
const BASELINE_SCALE_BY_SLUG = new Map<string, number>();
for (const d of MDT_DUNGEONS) {
  const scales = d.enemies
    .filter((e) => !e.isBoss && e.count > 0)
    .map((e) => (typeof e.scale === 'number' ? e.scale : 1))
    .sort((a, b) => a - b);
  const baseline = scales.length > 0 ? scales[Math.floor(scales.length / 2)] : 1;
  BASELINE_SCALE_BY_SLUG.set(d.instanceSlug, baseline);
}

export function findDungeonByMdtIdx(idx: number | undefined): MdtDungeonTable | undefined {
  if (idx == null) return undefined;
  return BY_MDT_INDEX.get(idx);
}

export function getMdtEnemyByNpcId(
  instanceSlug: string,
  npcId: number,
): MdtDungeonEnemy | undefined {
  return ENEMIES_BY_SLUG.get(instanceSlug)?.get(npcId);
}

/** Median non-boss mob scale in the given dungeon, or 1 if unknown. Use this as
 *  the baseline when deciding whether a mob is oversized relative to its peers. */
export function getBaselineMdtScale(instanceSlug: string): number {
  return BASELINE_SCALE_BY_SLUG.get(instanceSlug) ?? 1;
}
