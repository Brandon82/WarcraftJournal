import 'leaflet/dist/leaflet.css';
import './dungeonMap.css';
import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  Tooltip,
  useMap,
} from 'react-leaflet';
import {
  CRS,
  divIcon,
  type LatLngBoundsExpression,
  type LatLngExpression,
} from 'leaflet';
import type { MdtDungeonTable, MdtSpawnMarker } from '../../lib/mdt/types';

// Match threechest's coordinate system: CRS.Simple with bounds that cover
// the MDT map tiles. Spawn positions in our vendored JSON are already in
// this space (x ∈ [-256, 0], y ∈ [0, 384]) — see scripts/mdtDungeons.ts in
// threechest, which divides raw MDT coords by 2.185 at generation time.
const MAP_HEIGHT = 256;
const MAP_WIDTH = 384;
const MAP_BOUNDS: LatLngBoundsExpression = [
  [0, 0],
  [-MAP_HEIGHT, MAP_WIDTH],
];
const MAP_CENTER: LatLngExpression = [-MAP_HEIGHT / 2, MAP_WIDTH / 2];

// Base icon size in CSS pixels at zoom 2 (the initial fit). The marker
// scales via CSS when the user zooms in/out.
const TRASH_ICON_SIZE = 26;
const BOSS_ICON_SIZE = 44;

interface DungeonMapProps {
  dungeon: MdtDungeonTable;
  spawns?: MdtSpawnMarker[];
  selectedPullIndex: number | null;
  onSelectPull?: (pullIndex: number | null) => void;
}

export default function DungeonMap({
  dungeon,
  spawns,
  selectedPullIndex,
  onSelectPull,
}: DungeonMapProps) {
  const safeSpawns = spawns ?? [];

  // Build a convex hull per pull so every pull is outlined in its color.
  const pullHulls = useMemo(() => {
    const byPull = new Map<
      number,
      { color: string; points: Array<[number, number]> }
    >();
    for (const s of safeSpawns) {
      if (s.pullIndex == null || !s.pullColor) continue;
      const entry = byPull.get(s.pullIndex) ?? { color: s.pullColor, points: [] };
      entry.points.push([s.pos[0], s.pos[1]]);
      byPull.set(s.pullIndex, entry);
    }
    const out: Array<{ pullIndex: number; color: string; hull: Array<[number, number]> }> = [];
    for (const [pullIndex, { color, points }] of byPull) {
      if (points.length < 2) continue;
      out.push({ pullIndex, color, hull: convexHull(points) });
    }
    return out;
  }, [safeSpawns]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-wow-border bg-wow-bg-surface h-[720px]">
      <MapContainer
        key={dungeon.mapKey}
        className="w-full h-full"
        style={{ backgroundColor: 'var(--color-wow-bg-surface)' }}
        crs={CRS.Simple}
        center={MAP_CENTER}
        bounds={MAP_BOUNDS}
        minZoom={1}
        maxZoom={5}
        zoom={2}
        zoomSnap={0.25}
        zoomControl
        attributionControl={false}
        doubleClickZoom
        scrollWheelZoom
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url={`/maps/${dungeon.mapKey}/{x}_{y}.jpg`}
          bounds={MAP_BOUNDS}
          noWrap
          minNativeZoom={2}
          maxNativeZoom={2}
          tileSize={256}
        />
        <FitToBounds bounds={MAP_BOUNDS} dungeonKey={dungeon.mapKey} />

        {/* Draw a hull outline for every pull so the route is visible at a
            glance. The selected pull paints on top with stronger emphasis. */}
        {pullHulls
          .filter((h) => h.pullIndex !== selectedPullIndex)
          .map((h) => (
            <Polygon
              key={`hull-${h.pullIndex}`}
              positions={h.hull as LatLngExpression[]}
              pathOptions={{
                color: `#${h.color}`,
                weight: 2,
                opacity: 0.75,
                fillColor: `#${h.color}`,
                fillOpacity: 0.1,
                dashArray: '4 4',
                className: 'pointer-events-none',
              }}
            />
          ))}
        {pullHulls
          .filter((h) => h.pullIndex === selectedPullIndex)
          .map((h) => (
            <Polygon
              key={`hull-${h.pullIndex}-selected`}
              positions={h.hull as LatLngExpression[]}
              pathOptions={{
                color: `#${h.color}`,
                weight: 4,
                opacity: 1,
                fillColor: `#${h.color}`,
                fillOpacity: 0.2,
                className: 'pointer-events-none',
              }}
            />
          ))}

        {/* Non-selected spawns first so selected ones paint on top. */}
        {safeSpawns.map((spawn) => {
          if (spawn.pullIndex === selectedPullIndex) return null;
          return (
            <SpawnMarker
              key={spawn.spawnId}
              spawn={spawn}
              selected={false}
              onSelectPull={onSelectPull}
            />
          );
        })}
        {selectedPullIndex != null &&
          safeSpawns
            .filter((s) => s.pullIndex === selectedPullIndex)
            .map((spawn) => (
              <SpawnMarker
                key={spawn.spawnId}
                spawn={spawn}
                selected
                onSelectPull={onSelectPull}
              />
            ))}
      </MapContainer>
    </div>
  );
}

interface SpawnMarkerProps {
  spawn: MdtSpawnMarker;
  selected: boolean;
  onSelectPull?: (pullIndex: number | null) => void;
}

function SpawnMarker({ spawn, selected, onSelectPull }: SpawnMarkerProps) {
  const icon = useMemo(() => buildIcon(spawn, selected), [spawn, selected]);

  return (
    <Marker
      position={[spawn.pos[0], spawn.pos[1]] as LatLngExpression}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (spawn.pullIndex != null) onSelectPull?.(spawn.pullIndex);
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
        <div className="text-xs">
          <div className="font-semibold">{spawn.name}</div>
          {spawn.pullIndex != null && (
            <div className="text-[10px] opacity-80">Pull {spawn.pullIndex}</div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}

/**
 * Builds a Leaflet divIcon showing the NPC portrait in a pull-colored ring.
 * Non-pull trash is drawn smaller and muted so the route mobs stand out.
 */
function buildIcon(spawn: MdtSpawnMarker, selected: boolean) {
  const inPull = spawn.pullIndex != null;
  const baseSize = spawn.isBoss ? BOSS_ICON_SIZE : TRASH_ICON_SIZE;
  const size = selected ? Math.round(baseSize * 1.2) : baseSize;

  const ringColor = inPull && spawn.pullColor ? `#${spawn.pullColor}` : '#4b5563';
  const ringWidth = spawn.isBoss ? (selected ? 4 : 3) : selected ? 3 : 2;
  const opacity = inPull ? 1 : 0.55;
  const grayscale = inPull ? 0 : 0.6;
  const portraitUrl = `/npc_portraits/${spawn.npcId}.png`;

  const classes = [
    'mdt-mob-icon',
    selected ? 'mdt-mob-icon--selected' : '',
    spawn.isBoss ? 'mdt-mob-icon--boss' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const html = `
    <div class="${classes}" style="
      width: ${size}px;
      height: ${size}px;
      border: ${ringWidth}px solid ${ringColor};
      opacity: ${opacity};
      filter: grayscale(${grayscale});
    ">
      <img
        src="${portraitUrl}"
        alt=""
        draggable="false"
        onerror="this.style.display='none'"
      />
    </div>
  `;

  return divIcon({
    html,
    className: 'mdt-mob-icon-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Ensures the map refits its view when the dungeon changes. */
function FitToBounds({
  bounds,
  dungeonKey,
}: {
  bounds: LatLngBoundsExpression;
  dungeonKey: string;
}) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [10, 10] });
    map.setMaxBounds(bounds);
  }, [map, bounds, dungeonKey]);
  return null;
}

/** Andrew's monotone chain convex-hull, for outlining a pull. */
function convexHull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 3) return points.slice();
  const sorted = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: Array<[number, number]> = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Array<[number, number]> = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}
