import type { JournalExpansion } from '../types/expansion';
import type { JournalInstance } from '../types/instance';
import type { JournalEncounter } from '../types/encounter';
import type { ZoneSpellData } from '../types/zoneSpell';

import expansionsData from './generated/expansions.json';
import instancesData from './generated/instances.json';
import encountersData from './generated/encounters.json';
import zoneSpellsData from './generated/zone-spells.json';

export const expansions = expansionsData as JournalExpansion[];
export const instances = instancesData as JournalInstance[];
export const encounters = encountersData as JournalEncounter[];
export const zoneSpells = zoneSpellsData as ZoneSpellData[];

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

