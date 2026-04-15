// Normalizes a decoded MDT route into the shape the UI renders.
//
// MDT pulls are tables keyed by 1-based enemyIndex, with values that are
// arrays of clone indices identifying specific spawns. We join those
// indices against the vendored dungeon table to get NPC IDs and names,
// merging duplicate enemyIndex entries so each pull shows one row per
// unique NPC.

import { findDungeonByMdtIdx } from './dungeons';
import {
  MdtDecodeError,
  type MdtDungeonEnemy,
  type MdtPull,
  type MdtPullEnemy,
  type MdtSpawnMarker,
  type ParsedMdtRoute,
  type RawMdtRoute,
} from './types';

interface RawSpawn {
  id?: unknown;
  idx?: unknown;
  pos?: unknown;
}

export function parseMdtRoute(raw: RawMdtRoute): ParsedMdtRoute {
  const dungeonIdx = raw.value?.currentDungeonIdx;
  const dungeon = findDungeonByMdtIdx(dungeonIdx);
  if (!dungeon) {
    throw new MdtDecodeError(
      'unsupported_dungeon',
      dungeonIdx == null
        ? "This route doesn't include a dungeon reference."
        : `This route is for a dungeon (MDT index ${dungeonIdx}) that isn't part of the current M+ season.`,
    );
  }

  const rawPulls = Array.isArray(raw.value?.pulls) ? raw.value!.pulls! : [];
  const enemyByIdx = new Map<number, MdtDungeonEnemy>();
  for (const e of dungeon.enemies) enemyByIdx.set(e.enemyIndex, e);

  // Track which pull (if any) each (enemyIndex, cloneIdx) belongs to — needed
  // so the map dots can be colored by pull membership.
  const pullByClone = new Map<string, { pullIndex: number; color: string | null }>();

  const pulls: MdtPull[] = [];
  let totalForces = 0;

  rawPulls.forEach((rawPull, i) => {
    if (!rawPull || typeof rawPull !== 'object') return;
    const pullIndex = i + 1;
    // MDT routes emit colors inconsistently: some write "#ff3eff", others
    // write "ff3eff". Normalize to the bare hex form so callers can always
    // prepend "#" without producing "##ff3eff" (which renders as black).
    const rawColor = typeof rawPull.color === 'string' ? rawPull.color : null;
    const color = rawColor ? rawColor.replace(/^#/, '') : null;

    // Merge by enemyIndex so repeated keys (LibSerialize mixed tables produce
    // both numeric and string-form keys sometimes) get summed correctly.
    const cloneCountByEnemy = new Map<number, number>();
    for (const [key, value] of Object.entries(rawPull)) {
      const enemyIndex = Number(key);
      if (!Number.isInteger(enemyIndex) || enemyIndex <= 0) continue;
      if (!Array.isArray(value)) continue;
      const cloneCount = value.length;
      if (cloneCount <= 0) continue;
      cloneCountByEnemy.set(
        enemyIndex,
        (cloneCountByEnemy.get(enemyIndex) ?? 0) + cloneCount,
      );
      for (const cloneIdx of value) {
        if (typeof cloneIdx === 'number' && Number.isInteger(cloneIdx)) {
          pullByClone.set(`${enemyIndex}:${cloneIdx}`, { pullIndex, color });
        }
      }
    }

    const enemies: MdtPullEnemy[] = [];
    let pullForces = 0;
    for (const [enemyIndex, cloneCount] of cloneCountByEnemy) {
      const enemy = enemyByIdx.get(enemyIndex);
      if (!enemy) continue; // Enemy referenced by route but missing from our table — skip.
      const forces = (enemy.count ?? 0) * cloneCount;
      pullForces += forces;
      enemies.push({
        npcId: enemy.id,
        name: enemy.name,
        cloneCount,
        forces,
        isBoss: !!enemy.isBoss,
      });
    }

    // Sort bosses first, then by forces descending, then name.
    enemies.sort((a, b) => {
      if (a.isBoss !== b.isBoss) return a.isBoss ? -1 : 1;
      if (b.forces !== a.forces) return b.forces - a.forces;
      return a.name.localeCompare(b.name);
    });

    totalForces += pullForces;
    pulls.push({
      index: pullIndex,
      color: color ?? undefined,
      forces: pullForces,
      enemies,
    });
  });

  // Build the flat spawn-marker list the map overlay renders.
  const spawnMarkers: MdtSpawnMarker[] = [];
  for (const enemy of dungeon.enemies) {
    const spawns = Array.isArray(enemy.spawns) ? (enemy.spawns as RawSpawn[]) : [];
    for (const spawn of spawns) {
      const pos = spawn.pos;
      if (
        !Array.isArray(pos) ||
        pos.length < 2 ||
        typeof pos[0] !== 'number' ||
        typeof pos[1] !== 'number'
      ) continue;
      const idx = typeof spawn.idx === 'number' ? spawn.idx : null;
      const membership = idx != null ? pullByClone.get(`${enemy.enemyIndex}:${idx}`) : undefined;
      spawnMarkers.push({
        spawnId: typeof spawn.id === 'string' ? spawn.id : `${enemy.enemyIndex}-${idx ?? '?'}`,
        pos: [pos[0], pos[1]],
        npcId: enemy.id,
        name: enemy.name,
        isBoss: !!enemy.isBoss,
        pullIndex: membership?.pullIndex ?? null,
        pullColor: membership?.color ?? null,
      });
    }
  }

  return {
    title: typeof raw.text === 'string' && raw.text.trim() ? raw.text.trim() : 'Untitled route',
    dungeon,
    pulls,
    totalForces,
    spawnMarkers,
  };
}

