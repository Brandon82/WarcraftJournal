// Shared types for the MDT decoder and route parser.
//
// These mirror the shapes produced by the MDT addon's export: a binary
// LibSerialize payload wrapped in LibDeflate's print encoding. See
// decodeRoute.ts for the decoding pipeline and parseRoute.ts for the
// normalization that feeds the UI.

/** One pull, as produced by MDT. Numeric keys are 1-based enemy indices
 *  pointing at the dungeon's enemies table; the value is an array of
 *  clone indices identifying which individual spawns are in this pull. */
export type RawMdtPull = {
  color?: string;
} & Record<number, number[]>;

/** The top-level route object after binary deserialization. Every field is
 *  optional because old routes and partial shapes are common. */
export interface RawMdtRoute {
  text?: string;
  week?: number;
  difficulty?: number;
  uid?: string;
  value?: {
    currentPull?: number;
    currentSublevel?: number;
    currentDungeonIdx?: number;
    selection?: number[];
    pulls?: RawMdtPull[];
  };
  [key: string]: unknown;
}

/** An enemy entry in a vendored dungeon table (see dungeons/*.json).
 *  We only use id/name/count/isBoss; other fields are tolerated loosely. */
export interface MdtDungeonEnemy {
  id: number;
  enemyIndex: number;
  name: string;
  count: number;
  isBoss?: boolean;
  // Spawns contain coordinate data we don't need; leave them unstructured so
  // the vendored JSON files (which use `group: null`, `pos: number[]`, etc.)
  // can be imported without per-dungeon casts.
  spawns?: unknown;
  [extra: string]: unknown;
}

export interface MdtDungeonTable {
  /** MDT's internal dungeon index, used to key routes. */
  dungeonIndex: number;
  /** Enemy forces required to complete the dungeon. */
  totalCount: number;
  /** Our instance slug (from src/data/currentSeason.ts) so we can look up zone-spells. */
  instanceSlug: string;
  /** Human-readable dungeon name for display. */
  displayName: string;
  /** Short key used to locate map tile assets under /public/maps/<mapKey>/. */
  mapKey: string;
  /** MDT enemies, 1-indexed via the `enemyIndex` field. */
  enemies: MdtDungeonEnemy[];
}

/** One enemy line within a normalized pull. */
export interface MdtPullEnemy {
  npcId: number;
  name: string;
  /** How many of this enemy are in the pull. */
  cloneCount: number;
  /** Forces contribution (dungeon enemy count × cloneCount). */
  forces: number;
  isBoss: boolean;
}

export interface MdtPull {
  /** 1-based pull index. */
  index: number;
  /** Hex color (without `#`) assigned by MDT. */
  color?: string;
  /** Total enemy forces added by this pull. */
  forces: number;
  enemies: MdtPullEnemy[];
}

/** Per-spawn dot rendered on the dungeon map. */
export interface MdtSpawnMarker {
  spawnId: string;
  /** MDT position as [lat, lng] in the Leaflet-style bounds (lat in [-256,0], lng in [0,384]). */
  pos: [number, number];
  npcId: number;
  name: string;
  isBoss: boolean;
  /** 1-based pull index the spawn belongs to, or null when it isn't in any pull. */
  pullIndex: number | null;
  /** Pull color (hex without `#`) when the spawn is in a pull. */
  pullColor: string | null;
}

export interface ParsedMdtRoute {
  title: string;
  dungeon: MdtDungeonTable;
  pulls: MdtPull[];
  totalForces: number;
  spawnMarkers: MdtSpawnMarker[];
}

export type MdtDecodeErrorReason =
  | 'empty'
  | 'prefix'
  | 'base64'
  | 'inflate'
  | 'serialize'
  | 'shape'
  | 'unsupported_dungeon';

export class MdtDecodeError extends Error {
  readonly reason: MdtDecodeErrorReason;
  constructor(reason: MdtDecodeErrorReason, message: string) {
    super(message);
    this.name = 'MdtDecodeError';
    this.reason = reason;
  }
}
