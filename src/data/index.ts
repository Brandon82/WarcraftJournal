import type { JournalExpansion } from '../types/expansion';
import type { JournalInstance } from '../types/instance';
import type { JournalEncounter } from '../types/encounter';
import type { ZoneSpellData } from '../types/zoneSpell';

import expansionsData from './generated/expansions.json';
import instancesData from './generated/instances.json';
import encountersData from './generated/encounters.json';
import zoneSpellsData from './generated/zone-spells.json';
import raiderioRoutesData from './generated/raiderio-routes.json';

export const expansions = expansionsData as JournalExpansion[];
export const instances = instancesData as JournalInstance[];
export const encounters = encountersData as JournalEncounter[];
export const zoneSpells = zoneSpellsData as ZoneSpellData[];

export interface RaiderIOPlayer {
  name: string;
  className: string;
  classSlug: string;
  specName: string;
  specSlug: string;
  role: string;
  realm: string;
  region: string;
  profileUrl: string | null;
}

export interface RaiderIORouteSource {
  rank: number;
  keystoneRunId: number;
  loggedRunId: number;
  routeKey: string;
  mythicLevel: number;
  clearTimeMs: number;
  keystoneTimeMs: number;
  timeRemainingMs: number;
  numChests: number;
  completedAt: string;
  score: number;
  faction: string | null;
  rioSlug: string;
  dungeonName: string;
  runUrl: string;
  keystoneGuruUrl: string;
  players: RaiderIOPlayer[];
}

export interface RaiderIORoute {
  mdtString: string;
  source: RaiderIORouteSource;
  scrapedAt: string;
}

/** Top 3 timed Mythic+ runs with attached routes per dungeon, scraped from
 *  raider.io / keystone.guru at build time. Keyed by our internal instance
 *  slug. Each value is ordered by raider.io rank (best run first). May be
 *  empty if no dungeons yielded a usable route (or if the scraper has not
 *  been run). */
export const raiderioRoutes = raiderioRoutesData as Record<string, RaiderIORoute[]>;

// Most recent fetch timestamp across zone-spell entries — reflects the latest
// data refresh (zone-spells are written on every full run and on --only-zone-spells runs).
export const dataGeneratedAt: string = zoneSpells.reduce(
  (latest, z) => (z.fetchedAt && z.fetchedAt > latest ? z.fetchedAt : latest),
  '',
);

export const expansionBySlug = new Map(expansions.map((e) => [e.slug, e]));
export const expansionById = new Map(expansions.map((e) => [e.id, e]));

export const instanceBySlug = new Map(instances.map((i) => [i.slug, i]));
export const instanceById = new Map(instances.map((i) => [i.id, i]));

export const encounterBySlug = new Map(encounters.map((e) => [e.slug, e]));
export const encounterById = new Map(encounters.map((e) => [e.id, e]));

export function getInstancesForExpansion(expansionSlug: string): JournalInstance[] {
  const expansion = expansionBySlug.get(expansionSlug);
  if (!expansion) return [];
  const allRefs = [...expansion.raids, ...expansion.dungeons];
  return allRefs
    .map((ref) => instanceBySlug.get(ref.slug))
    .filter((i): i is JournalInstance => i !== undefined);
}

export const zoneSpellsByInstanceSlug = new Map(zoneSpells.map((z) => [z.instanceSlug, z]));

export function getEncountersForInstance(instanceSlug: string): JournalEncounter[] {
  const instance = instanceBySlug.get(instanceSlug);
  if (!instance) return [];
  return instance.encounters
    .map((ref) => encounterBySlug.get(ref.slug))
    .filter((e): e is JournalEncounter => e !== undefined);
}

