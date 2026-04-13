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
 * Primary signal: headerIcons 'heroic'/'mythic' tags (reliable for all content).
 * Secondary signal: difficultyMask bitmask (mode-index based, reliable for dungeon data).
 */
function sectionVisibleAtDifficulty(
  s: JournalSection,
  difficulty: Difficulty,
  modesBitmask: number,
): boolean {
  // Primary: use headerIcons tags (heroic = Heroic+, mythic = Mythic only)
  if (s.headerIcons) {
    let maxMinRank: number | undefined;
    for (const icon of s.headerIcons) {
      const rank = HEADER_ICON_MIN_DIFFICULTY[icon];
      if (rank != null && (maxMinRank == null || rank > maxMinRank)) maxMinRank = rank;
    }
    if (maxMinRank != null) return DIFFICULTY_RANK[difficulty] >= maxMinRank;
  }
  // Secondary: difficultyMask bitmask (mode-index based, works for dungeon sections)
  if (s.difficultyMask != null && s.difficultyMask > 0) {
    return (s.difficultyMask & modesBitmask) !== 0;
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
  const filtered = sections
    .filter((s) => sectionVisibleAtDifficulty(s, difficulty, modesBitmask))
    .map((s) =>
      s.sections
        ? { ...s, sections: filterSectionsRecursive(s.sections, difficulty, modesBitmask) }
        : s,
    )
    // Prune container sections that had children but are now empty after filtering
    .filter((s) => s.sections === undefined || s.sections.length > 0 || s.bodyText);
  return deduplicateSections(filtered, difficulty);
}

/**
 * Remove duplicate sibling sections. Two dedup strategies:
 * 1. Same spellId: keep the entry with more children / richer metadata.
 * 2. Same title, different spellIds, one tagged heroic/mythic: pick the version
 *    matching the current difficulty (e.g. show heroic version at heroic+).
 */
function deduplicateSections(sections: JournalSection[], difficulty: Difficulty): JournalSection[] {
  const removeIndices = new Set<number>();

  // Pass 1: same spellId
  const seenSpell = new Map<number, number>();
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (!s.spellId) continue;
    const prev = seenSpell.get(s.spellId);
    if (prev === undefined) {
      seenSpell.set(s.spellId, i);
    } else {
      const prevChildren = sections[prev].sections?.length ?? 0;
      const curChildren = s.sections?.length ?? 0;
      if (curChildren > prevChildren || (curChildren === prevChildren && s.headerIcons?.length && !sections[prev].headerIcons?.length)) {
        removeIndices.add(prev);
        seenSpell.set(s.spellId, i);
      } else {
        removeIndices.add(i);
      }
    }
  }

  // Pass 2: same title with difficulty-specific headerIcons (heroic/mythic)
  const seenTitle = new Map<string, number[]>();
  for (let i = 0; i < sections.length; i++) {
    if (removeIndices.has(i)) continue;
    const s = sections[i];
    if (!s.title) continue;
    const group = seenTitle.get(s.title);
    if (group) group.push(i);
    else seenTitle.set(s.title, [i]);
  }
  const playerLevel = DIFFICULTY_RANK[difficulty];
  for (const indices of seenTitle.values()) {
    if (indices.length < 2) continue;
    // Check if any entries have difficulty headerIcons
    const hasDiffTag = indices.some((i) => {
      const icons = sections[i].headerIcons;
      return icons?.includes('heroic') || icons?.includes('mythic');
    });
    if (!hasDiffTag) continue;
    // Pick the best match: highest difficulty tag that the player meets
    let bestIdx = indices[0];
    let bestRank = -1;
    for (const i of indices) {
      const icons = sections[i].headerIcons ?? [];
      let rank = 0;
      for (const icon of icons) {
        rank = Math.max(rank, HEADER_ICON_MIN_DIFFICULTY[icon] ?? 0);
      }
      if (rank <= playerLevel && rank > bestRank) {
        bestRank = rank;
        bestIdx = i;
      }
    }
    for (const i of indices) {
      if (i !== bestIdx) removeIndices.add(i);
    }
  }

  if (removeIndices.size === 0) return sections;
  return sections.filter((_, i) => !removeIndices.has(i));
}
