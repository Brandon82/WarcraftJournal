// Pure helpers for mutating a RawMdtRoute as the user builds one from
// scratch. Keeps the page component free of the index arithmetic involved in
// Lua's 1-based pulls and enemy/clone indexing. All helpers return a new
// RawMdtRoute so React state updates trigger re-renders cleanly.

import type { MapNote, MdtDungeonTable, RawMdtPull, RawMdtRoute } from './types';

/** MDT's default pull-color wheel. Cycled through as pulls are added so the
 *  first 10 pulls each get a distinct color; after that the cycle repeats. */
export const DEFAULT_PULL_COLORS = [
  'ff3eff',
  '00ff40',
  'ff4040',
  '40a0ff',
  'ffff40',
  'ff80ff',
  '80ff80',
  'ff8040',
  '40ffff',
  'c080ff',
] as const;

function nextColor(pullCount: number): string {
  return DEFAULT_PULL_COLORS[pullCount % DEFAULT_PULL_COLORS.length];
}

/** Build a fresh RawMdtRoute for the given dungeon, with one empty pull so
 *  users can immediately start assigning mobs without a required "Add pull"
 *  click first. */
export function createEmptyRoute(
  dungeon: MdtDungeonTable,
  title: string,
): RawMdtRoute {
  const firstPull: RawMdtPull = { color: nextColor(0) };
  return {
    text: title,
    value: {
      currentDungeonIdx: dungeon.dungeonIndex,
      pulls: [firstPull],
    },
  };
}

/** Append a new empty pull with the next default color. */
export function addPull(raw: RawMdtRoute): RawMdtRoute {
  const pulls = getPulls(raw);
  const next: RawMdtPull = { color: nextColor(pulls.length) };
  return withPulls(raw, [...pulls, next]);
}

/** Remove the pull at the given 1-based index. Other pulls shift down so
 *  what was pull 3 becomes pull 2 if pull 2 is deleted. */
export function removePull(raw: RawMdtRoute, pullIndex: number): RawMdtRoute {
  const pulls = getPulls(raw);
  if (pullIndex < 1 || pullIndex > pulls.length) return raw;
  const next = pulls.filter((_, i) => i + 1 !== pullIndex);
  return withPulls(raw, next);
}

/** Toggle a specific spawn in/out of the given pull. If the spawn is in any
 *  other pull, it's moved to the target. If it's already in the target pull,
 *  it's removed. */
export function toggleSpawnInPull(
  raw: RawMdtRoute,
  pullIndex: number,
  enemyIndex: number,
  cloneIdx: number,
): RawMdtRoute {
  const pulls = getPulls(raw);
  if (pullIndex < 1 || pullIndex > pulls.length) return raw;

  let alreadyInTarget = false;
  // Strip the spawn from whichever pull currently holds it (if any).
  const stripped = pulls.map((pull, i) => {
    const existing = pull[enemyIndex];
    if (!Array.isArray(existing) || !existing.includes(cloneIdx)) return pull;
    if (i + 1 === pullIndex) alreadyInTarget = true;
    const nextClones = existing.filter((c) => c !== cloneIdx);
    const nextPull: RawMdtPull = { ...pull };
    if (nextClones.length === 0) {
      delete nextPull[enemyIndex];
    } else {
      nextPull[enemyIndex] = nextClones;
    }
    return nextPull;
  });

  if (alreadyInTarget) {
    // Toggle-off: stripping was the whole action.
    return withPulls(raw, stripped);
  }

  // Toggle-on: add to the target pull.
  const target = stripped[pullIndex - 1];
  const existing = Array.isArray(target[enemyIndex])
    ? (target[enemyIndex] as number[])
    : [];
  const nextTarget: RawMdtPull = {
    ...target,
    [enemyIndex]: [...existing, cloneIdx],
  };
  const nextPulls = stripped.slice();
  nextPulls[pullIndex - 1] = nextTarget;
  return withPulls(raw, nextPulls);
}

/** Toggle every spawn that shares `group` (across all enemies in the dungeon)
 *  in/out of the target pull. The dominant action is determined by the clicked
 *  spawn: if it is currently in the target pull, the whole group is removed
 *  from the target; otherwise every group spawn is moved/added into the target
 *  (existing memberships in other pulls are stripped first). This mirrors how
 *  MDT treats a single click on a packed mob. */
export function toggleGroupInPull(
  raw: RawMdtRoute,
  pullIndex: number,
  members: Array<{ enemyIndex: number; cloneIdx: number }>,
  removeMode: boolean,
): RawMdtRoute {
  const pulls = getPulls(raw);
  if (pullIndex < 1 || pullIndex > pulls.length) return raw;
  if (members.length === 0) return raw;

  // Build a quick lookup of "is this member in the target pull right now?"
  const memberKeys = new Set(members.map((m) => `${m.enemyIndex}:${m.cloneIdx}`));

  // Strip every group member from every pull (a clean slate for the rebuild).
  const stripped = pulls.map((pull) => {
    const next: RawMdtPull = { ...pull };
    for (const [key, value] of Object.entries(pull)) {
      const enemyIndex = Number(key);
      if (!Number.isInteger(enemyIndex) || enemyIndex <= 0) continue;
      if (!Array.isArray(value)) continue;
      const filtered = value.filter(
        (cloneIdx) => !memberKeys.has(`${enemyIndex}:${cloneIdx}`),
      );
      if (filtered.length === 0) {
        delete next[enemyIndex];
      } else if (filtered.length !== value.length) {
        next[enemyIndex] = filtered;
      }
    }
    return next;
  });

  if (removeMode) return withPulls(raw, stripped);

  // Add each member to the target pull, grouped by enemyIndex.
  const target: RawMdtPull = { ...stripped[pullIndex - 1] };
  const byEnemy = new Map<number, number[]>();
  for (const m of members) {
    const arr = byEnemy.get(m.enemyIndex) ?? [];
    arr.push(m.cloneIdx);
    byEnemy.set(m.enemyIndex, arr);
  }
  for (const [enemyIndex, clones] of byEnemy) {
    const existing = Array.isArray(target[enemyIndex]) ? (target[enemyIndex] as number[]) : [];
    target[enemyIndex] = [...existing, ...clones];
  }
  const next = stripped.slice();
  next[pullIndex - 1] = target;
  return withPulls(raw, next);
}

/** Update the route's title. */
export function renameRoute(raw: RawMdtRoute, title: string): RawMdtRoute {
  return { ...raw, text: title };
}

/** Reorder pulls: move the pull at `fromIdx` (1-based) to `toIdx` (1-based).
 *  Pull colors travel with the pull rather than staying at the slot, since
 *  routes are usually shared as "pull 3 is the green one" — keeping the
 *  color anchored to the contents matches user intuition. */
export function reorderPull(
  raw: RawMdtRoute,
  fromIdx: number,
  toIdx: number,
): RawMdtRoute {
  const pulls = getPulls(raw);
  if (fromIdx < 1 || fromIdx > pulls.length) return raw;
  if (toIdx < 1 || toIdx > pulls.length) return raw;
  if (fromIdx === toIdx) return raw;

  const next = pulls.slice();
  const [moved] = next.splice(fromIdx - 1, 1);
  next.splice(toIdx - 1, 0, moved);
  return withPulls(raw, next);
}

/** Append a free-form note pinned to a map position. */
export function addNote(
  raw: RawMdtRoute,
  note: MapNote,
): RawMdtRoute {
  const notes = getNotes(raw);
  return withNotes(raw, [...notes, note]);
}

/** Update an existing note's text and/or position. No-op if id not found. */
export function updateNote(
  raw: RawMdtRoute,
  id: string,
  patch: Partial<Pick<MapNote, 'text' | 'pos'>>,
): RawMdtRoute {
  const notes = getNotes(raw);
  let changed = false;
  const next = notes.map((n) => {
    if (n.id !== id) return n;
    changed = true;
    return { ...n, ...patch };
  });
  return changed ? withNotes(raw, next) : raw;
}

/** Remove a note by id. */
export function removeNote(raw: RawMdtRoute, id: string): RawMdtRoute {
  const notes = getNotes(raw);
  const next = notes.filter((n) => n.id !== id);
  if (next.length === notes.length) return raw;
  return withNotes(raw, next);
}

function getNotes(raw: RawMdtRoute): MapNote[] {
  return Array.isArray(raw.value?.wjNotes) ? raw.value!.wjNotes! : [];
}

function withNotes(raw: RawMdtRoute, notes: MapNote[]): RawMdtRoute {
  return {
    ...raw,
    value: {
      ...(raw.value ?? {}),
      wjNotes: notes,
    },
  };
}

function getPulls(raw: RawMdtRoute): RawMdtPull[] {
  return Array.isArray(raw.value?.pulls) ? raw.value!.pulls! : [];
}

function withPulls(raw: RawMdtRoute, pulls: RawMdtPull[]): RawMdtRoute {
  return {
    ...raw,
    value: {
      ...(raw.value ?? {}),
      pulls,
    },
  };
}

/** Parse a spawn ID ("1-3") into its enemyIndex and cloneIdx. Returns null
 *  for unrecognized formats (the dungeon tables all use this shape, but
 *  the parser has a fallback for bad data — stay defensive). */
export function parseSpawnId(
  spawnId: string,
): { enemyIndex: number; cloneIdx: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(spawnId);
  if (!m) return null;
  return { enemyIndex: Number(m[1]), cloneIdx: Number(m[2]) };
}
