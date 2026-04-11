import type { JournalExpansion } from '../types/expansion';
import type { JournalInstance } from '../types/instance';
import type { JournalEncounter } from '../types/encounter';
import type { JournalSection } from '../types/section';
import type { ZoneSpellData } from '../types/zoneSpell';
import { Difficulty } from '../types/common';

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

// Map our Difficulty enum to Blizzard mode types
const DIFFICULTY_TO_MODE_TYPES: Record<Difficulty, string[]> = {
  [Difficulty.LFR]: ['LFR'],
  [Difficulty.Normal]: ['NORMAL'],
  [Difficulty.Heroic]: ['HEROIC'],
  [Difficulty.Mythic]: ['MYTHIC', 'MYTHIC_KEYSTONE'],
};

// Fallback: if no difficultyMask, use headerIcon to infer visibility
const DIFFICULTY_RANK: Record<Difficulty, number> = {
  [Difficulty.LFR]: 0,
  [Difficulty.Normal]: 1,
  [Difficulty.Heroic]: 2,
  [Difficulty.Mythic]: 3,
};

const HEADER_ICON_MIN_DIFFICULTY: Record<string, number> = {
  heroic: DIFFICULTY_RANK[Difficulty.Heroic],
  mythic: DIFFICULTY_RANK[Difficulty.Mythic],
};

/**
 * Check if a section is visible at a given difficulty.
 * difficultyMask bits correspond to the encounter's modes array indices.
 */
function sectionVisibleAtDifficulty(
  s: JournalSection,
  difficulty: Difficulty,
  modesBitmask: number,
): boolean {
  // Use difficultyMask if available
  if (s.difficultyMask != null && s.difficultyMask > 0) {
    return (s.difficultyMask & modesBitmask) !== 0;
  }
  // Fallback: use headerIcon tags (heroic = Heroic+, mythic = Mythic only)
  if (s.headerIcon) {
    const minRank = HEADER_ICON_MIN_DIFFICULTY[s.headerIcon];
    if (minRank != null) return DIFFICULTY_RANK[difficulty] >= minRank;
  }
  return true;
}

/** Build a bitmask of which mode indices match the selected difficulty. */
function buildModesBitmask(
  modes: Array<{ type: string }>,
  difficulty: Difficulty,
): number {
  const matchTypes = DIFFICULTY_TO_MODE_TYPES[difficulty];
  let mask = 0;
  for (let i = 0; i < modes.length; i++) {
    if (matchTypes.includes(modes[i].type)) {
      mask |= 1 << i;
    }
  }
  return mask;
}

/** Recursively filter a section tree, hiding sections not available at the selected difficulty. */
export function filterSectionsByDifficulty(
  sections: JournalSection[],
  difficulty: Difficulty,
  modes: Array<{ type: string }>,
): JournalSection[] {
  const modesBitmask = buildModesBitmask(modes, difficulty);
  return filterSectionsRecursive(sections, difficulty, modesBitmask);
}

function filterSectionsRecursive(
  sections: JournalSection[],
  difficulty: Difficulty,
  modesBitmask: number,
): JournalSection[] {
  return sections
    .filter((s) => sectionVisibleAtDifficulty(s, difficulty, modesBitmask))
    .map((s) =>
      s.sections
        ? { ...s, sections: filterSectionsRecursive(s.sections, difficulty, modesBitmask) }
        : s,
    );
}
