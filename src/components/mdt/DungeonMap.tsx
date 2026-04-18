import 'leaflet/dist/leaflet.css';
import './dungeonMap.css';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import {
  CRS,
  divIcon,
  type LatLngBoundsExpression,
  type LatLngExpression,
  type LeafletMouseEvent,
} from 'leaflet';
import { FullscreenOutlined, FullscreenExitOutlined, AimOutlined } from '@ant-design/icons';
import type {
  MapNote,
  MdtDungeonEnemy,
  MdtDungeonTable,
  MdtPull,
  MdtSpawnMarker,
} from '../../lib/mdt/types';
import SpawnContextMenu from './SpawnContextMenu';
import MapLayersControl from './MapLayersControl';
import MapNoteEditor from './MapNoteEditor';
import { DEFAULT_LAYERS, type MapLayers } from './mapLayers';
import { useLayout } from '../../context/LayoutContext';

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

interface SpawnClickInfo {
  /** True when the click was made with Alt/Option held — the builder uses
   *  this to bypass group-select and act on a single mob. */
  alt: boolean;
  /** True when the click was made with Shift held — the builder uses this
   *  to open the mob info side panel instead of toggling the spawn. */
  shift: boolean;
}

export interface FocusPullRequest {
  pullIndex: number;
  /** Increment to retrigger a refit even for the same pullIndex. */
  nonce: number;
}

interface DungeonMapProps {
  dungeon: MdtDungeonTable;
  spawns?: MdtSpawnMarker[];
  /** All pulls in the route, used for badges, traversal lines, and the
   *  right-click context-menu submenu. */
  pulls?: MdtPull[];
  /** Free-form notes pinned to map positions. Right-click on empty map area
   *  to add a new note when `onAddNote` is provided. */
  notes?: MapNote[];
  selectedPullIndex: number | null;
  onSelectPull?: (pullIndex: number | null) => void;
  /** When provided, clicking a spawn calls this instead of selecting its pull
   *  — used by the route builder to toggle spawns into/out of the active pull. */
  onToggleSpawn?: (spawn: MdtSpawnMarker, info: SpawnClickInfo) => void;
  /** Builder-only: shift-click a spawn to inspect its abilities/details. */
  onShowMobInfo?: (spawn: MdtSpawnMarker) => void;
  /** Builder-only: right-click "Move to Pull N" submenu callback. */
  onMoveSpawnToPull?: (spawn: MdtSpawnMarker, pullIndex: number) => void;
  /** Builder-only: right-click "Remove from pull" callback. */
  onRemoveSpawn?: (spawn: MdtSpawnMarker) => void;
  /** Builder-only: right-click on empty map adds a note here. */
  onAddNote?: (pos: [number, number], text: string) => void;
  /** Builder-only: edit existing note text. */
  onUpdateNote?: (id: string, text: string) => void;
  /** Builder-only: remove a note. */
  onRemoveNote?: (id: string) => void;
  /** Bumped each time the user clicks a pull in the sidebar — refits to it. */
  focusPull?: FocusPullRequest | null;
  /** Pulls sidebar (or any side-panel content) rendered to the right of the
   *  map. Travels into the fullscreen overlay when the map is expanded so
   *  users can keep editing pulls without exiting fullscreen. */
  sidebar?: ReactNode;
  /** Optional CSS width for the sidebar column. Defaults to 240px. */
  sidebarWidth?: string;
}

export default function DungeonMap({
  dungeon,
  spawns,
  pulls,
  notes,
  selectedPullIndex,
  onSelectPull,
  onToggleSpawn,
  onShowMobInfo,
  onMoveSpawnToPull,
  onRemoveSpawn,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  focusPull,
  sidebar,
  sidebarWidth = '240px',
}: DungeonMapProps) {
  const [expanded, setExpanded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [contextMenu, setContextMenu] = useState<{
    spawn: MdtSpawnMarker;
    x: number;
    y: number;
  } | null>(null);
  // React-owned hover tooltip. We drive it from marker mouseover/mouseout
  // instead of react-leaflet <Tooltip> because leaflet tooltips can linger
  // when markers are rebuilt or overlap, causing the tooltip to show when
  // the mouse isn't over any NPC.
  const [hoverTooltip, setHoverTooltip] = useState<{
    spawn: MdtSpawnMarker;
    enemy: MdtDungeonEnemy | undefined;
    packSize: number;
    x: number;
    y: number;
  } | null>(null);
  // Note editor state. `mode: 'create'` makes the editor save a brand-new
  // note at `pos`; `mode: 'edit'` updates an existing note by id.
  const [noteEditor, setNoteEditor] = useState<
    | {
        mode: 'create';
        pos: [number, number];
        screenX: number;
        screenY: number;
      }
    | {
        mode: 'edit';
        id: string;
        text: string;
        screenX: number;
        screenY: number;
      }
    | null
  >(null);
  // Stabilize fallback identity so downstream useMemo dependencies don't
  // invalidate every render when the parent passes `undefined`.
  const safeSpawns = useMemo(() => spawns ?? [], [spawns]);
  const safePulls = useMemo(() => pulls ?? [], [pulls]);
  const safeNotes = useMemo(() => notes ?? [], [notes]);

  // True while the fixed overlay is visible — stays true during
  // the close animation so elements can animate out before unmounting.
  const overlayActive = expanded || animating;

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAnimating(true);
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

  const { setHideHeader } = useLayout();
  useEffect(() => {
    setHideHeader(expanded);
    return () => setHideHeader(false);
  }, [expanded, setHideHeader]);

  // Lookup table keyed by NPC id so the tooltip can show forces, count and
  // creature type without an O(n) scan per render.
  const enemyByNpcId = useMemo(() => {
    const m = new Map<number, MdtDungeonEnemy>();
    for (const e of dungeon.enemies) m.set(e.id, e);
    return m;
  }, [dungeon]);

  // Pack-size lookup: how many spawns share each group? Surfaced in the
  // tooltip so the user knows whether group-select will pull 1 mob or 6.
  const groupSize = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of safeSpawns) {
      if (s.group == null) continue;
      m.set(s.group, (m.get(s.group) ?? 0) + 1);
    }
    return m;
  }, [safeSpawns]);

  // Build a convex hull per pull so every pull is outlined in its color.
  // Centroid is just the mean of hull vertices — close enough for badge
  // placement and cheap to compute.
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
    const out: Array<{
      pullIndex: number;
      color: string;
      hull: Array<[number, number]>;
      centroid: [number, number];
    }> = [];
    for (const [pullIndex, { color, points }] of byPull) {
      const hull = points.length < 2 ? points.slice() : convexHull(points);
      const centroid = centroidOf(points);
      out.push({ pullIndex, color, hull, centroid });
    }
    out.sort((a, b) => a.pullIndex - b.pullIndex);
    return out;
  }, [safeSpawns]);

  // Ordered list of pull centroids for the traversal-line polyline.
  const traversalPath: LatLngExpression[] = useMemo(
    () => pullHulls.map((p) => p.centroid as LatLngExpression),
    [pullHulls],
  );

  // Spawns grouped by patrol-having mobs only — keeps the polyline list short.
  const patrolSpawns = useMemo(
    () => safeSpawns.filter((s) => s.patrol != null),
    [safeSpawns],
  );

  // Filter out non-pull trash when the user toggles it off in the layer panel.
  const visibleSpawns = useMemo(
    () => (layers.trash ? safeSpawns : safeSpawns.filter((s) => s.pullIndex != null)),
    [safeSpawns, layers.trash],
  );

  function handleContextMenu(spawn: MdtSpawnMarker, evt: MouseEvent) {
    if (!onMoveSpawnToPull && !onRemoveSpawn) return;
    setContextMenu({ spawn, x: evt.clientX, y: evt.clientY });
  }

  function handleHoverSpawn(
    spawn: MdtSpawnMarker,
    enemy: MdtDungeonEnemy | undefined,
    packSize: number,
    e: LeafletMouseEvent,
  ) {
    const orig = e.originalEvent as MouseEvent | undefined;
    if (!orig) return;
    setHoverTooltip({ spawn, enemy, packSize, x: orig.clientX, y: orig.clientY });
  }

  return (
    <>
      {overlayActive && <div className="mdt-map-container" aria-hidden />}
      {overlayActive && (
        <div
          className={`fixed inset-0 z-40 bg-black/60 ${
            animating && !expanded ? 'mdt-backdrop-out' : 'mdt-backdrop-in'
          }`}
          onClick={() => { setAnimating(true); setExpanded(false); }}
        />
      )}
      <div
        className={
          overlayActive
            ? `fixed inset-4 z-50 rounded-xl overflow-hidden border border-wow-border bg-wow-bg-surface flex mdt-map-layout${
                animating ? (expanded ? ' mdt-map-expanding' : ' mdt-map-collapsing') : ''
              }`
            : 'relative rounded-xl overflow-hidden border border-wow-border bg-wow-bg-surface mdt-map-container mdt-map-layout flex'
        }
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) setAnimating(false); }}
      >
        <div className="relative flex-1 min-w-0 mdt-map-viewport">
        <button
          type="button"
          onClick={() => setResetTrigger((n) => n + 1)}
          className="mdt-map-reset-btn"
          title="Reset map position"
        >
          <AimOutlined />
        </button>
        <button
          type="button"
          onClick={() => {
            if (expanded) {
              setAnimating(true);
              setExpanded(false);
            } else {
              setExpanded(true);
              setAnimating(true);
            }
          }}
          className="mdt-map-expand-btn"
          title={expanded ? 'Exit fullscreen (Esc)' : 'Expand map'}
        >
          {expanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        </button>
        <MapContainer
          key={dungeon.mapKey}
          className="w-full h-full"
          style={{ backgroundColor: 'var(--color-wow-bg-surface)' }}
          crs={CRS.Simple}
          center={MAP_CENTER}
          bounds={MAP_BOUNDS}
          minZoom={1}
          maxZoom={5}
          zoom={3}
          zoomSnap={0.25}
          zoomControl
          attributionControl={false}
          doubleClickZoom={false}
          scrollWheelZoom
        >
          <TileLayer
            url={`/maps/${dungeon.mapKey}/{x}_{y}.jpg`}
            bounds={MAP_BOUNDS}
            noWrap
            minNativeZoom={2}
            maxNativeZoom={2}
            tileSize={256}
          />
          <FitToBounds bounds={MAP_BOUNDS} dungeonKey={dungeon.mapKey} expanded={expanded} animating={animating} />
          <ResetView bounds={MAP_BOUNDS} trigger={resetTrigger} />
          <ZoomScaleTracker />
          <PackHoverHighlighter group={hoveredGroup} />
          <FocusPullView spawns={safeSpawns} request={focusPull ?? null} />
          <CursorCoordsReadout />
          <TooltipAutoCloser onClose={() => setHoverTooltip(null)} />
          <MapLayersControl layers={layers} onChange={setLayers} />
          {onAddNote && (
            <MapRightClickToAddNote
              onRequest={(pos, x, y) =>
                setNoteEditor({ mode: 'create', pos, screenX: x, screenY: y })
              }
            />
          )}

          {/* Pull outlines (hulls). Selected pull paints on top with stronger
              emphasis and a class that picks up the pulse animation. */}
          {layers.outlines && pullHulls
            .filter((h) => h.pullIndex !== selectedPullIndex && h.hull.length >= 2)
            .map((h) => (
              <Polygon
                key={`hull-${h.pullIndex}`}
                positions={h.hull as LatLngExpression[]}
                pathOptions={{
                  color: `#${h.color}`,
                  weight: 4,
                  opacity: 0.85,
                  fillColor: `#${h.color}`,
                  fillOpacity: 0.3,
                  className: 'pointer-events-none',
                }}
              />
            ))}
          {layers.outlines && pullHulls
            .filter((h) => h.pullIndex === selectedPullIndex && h.hull.length >= 2)
            .map((h) => (
              <Polygon
                key={`hull-${h.pullIndex}-selected`}
                positions={h.hull as LatLngExpression[]}
                pathOptions={{
                  color: `#${h.color}`,
                  weight: 4,
                  opacity: 1,
                  fillColor: `#${h.color}`,
                  fillOpacity: 0.3,
                  className: 'pointer-events-none mdt-pull-hull--selected',
                }}
              />
            ))}

          {/* Pull traversal line: connects pull 1 → 2 → 3 ... centroids. */}
          {layers.lines && traversalPath.length >= 2 && (
            <Polyline
              positions={traversalPath}
              pathOptions={{
                color: '#fbbf24',
                weight: 2,
                opacity: 0.6,
                dashArray: '6 6',
                className: 'pointer-events-none',
              }}
            />
          )}

          {/* Patrol paths: dashed line through each patrolling mob's waypoints,
              colored by pull when assigned and muted otherwise. */}
          {layers.patrols && patrolSpawns.map((s) => (
            <Polyline
              key={`patrol-${s.spawnId}`}
              positions={s.patrol as LatLngExpression[]}
              pathOptions={{
                color: s.pullColor ? `#${s.pullColor}` : '#9ca3af',
                weight: 1.5,
                opacity: s.pullColor ? 0.7 : 0.4,
                dashArray: '3 5',
                className: 'pointer-events-none',
              }}
            />
          ))}

          {/* Non-selected spawns first so selected ones paint on top. */}
          {visibleSpawns.map((spawn) => {
            if (spawn.pullIndex === selectedPullIndex) return null;
            return (
              <SpawnMarker
                key={spawn.spawnId}
                spawn={spawn}
                selected={false}
                enemy={enemyByNpcId.get(spawn.npcId)}
                packSize={spawn.group != null ? groupSize.get(spawn.group) ?? 1 : 1}
                onSelectPull={onSelectPull}
                onToggleSpawn={onToggleSpawn}
                onShowMobInfo={onShowMobInfo}
                onHoverGroup={setHoveredGroup}
                onHoverSpawn={handleHoverSpawn}
                onLeaveSpawn={() => setHoverTooltip(null)}
                onContextMenu={handleContextMenu}
              />
            );
          })}
          {selectedPullIndex != null &&
            visibleSpawns
              .filter((s) => s.pullIndex === selectedPullIndex)
              .map((spawn) => (
                <SpawnMarker
                  key={spawn.spawnId}
                  spawn={spawn}
                  selected
                  enemy={enemyByNpcId.get(spawn.npcId)}
                  packSize={spawn.group != null ? groupSize.get(spawn.group) ?? 1 : 1}
                  onSelectPull={onSelectPull}
                  onToggleSpawn={onToggleSpawn}
                  onShowMobInfo={onShowMobInfo}
                  onHoverGroup={setHoveredGroup}
                  onHoverSpawn={handleHoverSpawn}
                  onLeaveSpawn={() => setHoverTooltip(null)}
                  onContextMenu={handleContextMenu}
                />
              ))}

          {/* Pull number badges, drawn on top of everything else. */}
          {layers.labels && pullHulls.map((h) => (
            <Marker
              key={`badge-${h.pullIndex}`}
              position={h.centroid as LatLngExpression}
              icon={buildPullBadge(h.pullIndex, h.color, h.pullIndex === selectedPullIndex)}
              interactive={false}
              keyboard={false}
              zIndexOffset={10000}
            />
          ))}

          {/* User-authored notes pinned to map positions. */}
          {safeNotes.map((note) => (
            <Marker
              key={`note-${note.id}`}
              position={note.pos as LatLngExpression}
              icon={buildNoteIcon(note.text)}
              eventHandlers={{
                click: (e) => {
                  if (!onUpdateNote && !onRemoveNote) return;
                  const orig = e.originalEvent as MouseEvent | undefined;
                  if (!orig) return;
                  setNoteEditor({
                    mode: 'edit',
                    id: note.id,
                    text: note.text,
                    screenX: orig.clientX,
                    screenY: orig.clientY,
                  });
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <div className="text-xs max-w-[220px] whitespace-pre-wrap">{note.text}</div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
        {hoverTooltip && (
          <SpawnHoverTooltip
            spawn={hoverTooltip.spawn}
            enemy={hoverTooltip.enemy}
            packSize={hoverTooltip.packSize}
            x={hoverTooltip.x}
            y={hoverTooltip.y}
          />
        )}
        </div>
        {sidebar && (
          <aside
            className="mdt-map-sidebar border-l border-wow-border bg-wow-bg-elevated overflow-y-auto p-3 shrink-0"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </aside>
        )}
      </div>

      {contextMenu && (
        <SpawnContextMenu
          spawn={contextMenu.spawn}
          pulls={safePulls}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onMoveToPull={(pullIdx) => {
            onMoveSpawnToPull?.(contextMenu.spawn, pullIdx);
            setContextMenu(null);
          }}
          onRemove={
            onRemoveSpawn
              ? () => {
                  onRemoveSpawn(contextMenu.spawn);
                  setContextMenu(null);
                }
              : undefined
          }
        />
      )}

      {noteEditor && noteEditor.mode === 'create' && onAddNote && (
        <MapNoteEditor
          initialText=""
          x={noteEditor.screenX}
          y={noteEditor.screenY}
          onSave={(text) => {
            onAddNote(noteEditor.pos, text);
            setNoteEditor(null);
          }}
          onCancel={() => setNoteEditor(null)}
        />
      )}
      {noteEditor && noteEditor.mode === 'edit' && onUpdateNote && (
        <MapNoteEditor
          initialText={noteEditor.text}
          x={noteEditor.screenX}
          y={noteEditor.screenY}
          onSave={(text) => {
            onUpdateNote(noteEditor.id, text);
            setNoteEditor(null);
          }}
          onDelete={
            onRemoveNote
              ? () => {
                  onRemoveNote(noteEditor.id);
                  setNoteEditor(null);
                }
              : undefined
          }
          onCancel={() => setNoteEditor(null)}
        />
      )}
    </>
  );
}

/** Captures a contextmenu (right-click) on empty map area and reports the
 *  map coordinate plus screen position so the parent can spawn a note
 *  editor. Spawn-marker right-clicks are handled by their own marker
 *  contextmenu handler and don't bubble to the map. */
function MapRightClickToAddNote({
  onRequest,
}: {
  onRequest: (pos: [number, number], screenX: number, screenY: number) => void;
}) {
  useMapEvents({
    contextmenu: (e) => {
      e.originalEvent.preventDefault();
      onRequest(
        [e.latlng.lat, e.latlng.lng],
        e.originalEvent.clientX,
        e.originalEvent.clientY,
      );
    },
  });
  return null;
}

interface SpawnMarkerProps {
  spawn: MdtSpawnMarker;
  selected: boolean;
  enemy: MdtDungeonEnemy | undefined;
  packSize: number;
  onSelectPull?: (pullIndex: number | null) => void;
  onToggleSpawn?: (spawn: MdtSpawnMarker, info: SpawnClickInfo) => void;
  onShowMobInfo?: (spawn: MdtSpawnMarker) => void;
  onHoverGroup?: (group: number | null) => void;
  onHoverSpawn?: (
    spawn: MdtSpawnMarker,
    enemy: MdtDungeonEnemy | undefined,
    packSize: number,
    e: LeafletMouseEvent,
  ) => void;
  onLeaveSpawn?: () => void;
  onContextMenu?: (spawn: MdtSpawnMarker, evt: MouseEvent) => void;
}

function SpawnMarker({
  spawn,
  selected,
  enemy,
  packSize,
  onSelectPull,
  onToggleSpawn,
  onShowMobInfo,
  onHoverGroup,
  onHoverSpawn,
  onLeaveSpawn,
  onContextMenu,
}: SpawnMarkerProps) {
  const icon = useMemo(() => buildIcon(spawn, selected), [spawn, selected]);

  return (
    <Marker
      position={[spawn.pos[0], spawn.pos[1]] as LatLngExpression}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          // Builder mode takes priority: assigning a spawn is the primary
          // action. Otherwise fall back to viewer behavior (select the pull
          // this spawn belongs to).
          if (onToggleSpawn) {
            const orig = e.originalEvent as MouseEvent | undefined;
            const info = {
              alt: !!orig?.altKey,
              shift: !!orig?.shiftKey,
            };
            if (info.shift && onShowMobInfo) {
              onShowMobInfo(spawn);
              return;
            }
            onToggleSpawn(spawn, info);
          } else if (spawn.pullIndex != null) {
            onSelectPull?.(spawn.pullIndex);
          }
        },
        contextmenu: (e) => {
          if (!onContextMenu) return;
          const orig = e.originalEvent as MouseEvent | undefined;
          if (!orig) return;
          orig.preventDefault();
          onContextMenu(spawn, orig);
        },
        mouseover: (e) => {
          if (spawn.group != null) onHoverGroup?.(spawn.group);
          onHoverSpawn?.(spawn, enemy, packSize, e);
        },
        mousemove: (e) => {
          onHoverSpawn?.(spawn, enemy, packSize, e);
        },
        mouseout: () => {
          if (spawn.group != null) onHoverGroup?.(null);
          onLeaveSpawn?.();
        },
      }}
    />
  );
}

/** Safety net for the hover tooltip: clears it when the user starts panning,
 *  zooms, or the cursor leaves the map area. Without this, if a marker's
 *  mouseout is missed (it can happen when a marker is rebuilt while hovered,
 *  or when moving quickly between overlapping markers), the tooltip would
 *  stay open until another marker is hovered. */
function TooltipAutoCloser({ onClose }: { onClose: () => void }) {
  useMapEvents({
    movestart: onClose,
    zoomstart: onClose,
    mouseout: onClose,
    click: onClose,
  });
  return null;
}

/** Custom hover tooltip rendered at the map wrapper level, styled to match
 *  the boss-overview spell tooltips (dark bg, gold title, icon on left).
 *  React owns the open/close lifecycle so the tooltip can't linger the way
 *  leaflet's native tooltip sometimes does when markers overlap or rebuild. */
function SpawnHoverTooltip({
  spawn,
  enemy,
  packSize,
  x,
  y,
}: {
  spawn: MdtSpawnMarker;
  enemy: MdtDungeonEnemy | undefined;
  packSize: number;
  x: number;
  y: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const creatureType = typeof enemy?.creatureType === 'string' ? enemy.creatureType : null;
  const perMobForces = typeof enemy?.count === 'number' ? enemy.count : null;
  const health = typeof enemy?.health === 'number' ? enemy.health : null;
  const portraitUrl = `/npc_portraits/${spawn.npcId}.png`;

  // Position the tooltip above+right of the cursor, but clamp to viewport so
  // it never clips off-screen near the map edges.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offsetX = 14;
    const offsetY = 14;
    let left = x + offsetX;
    let top = y - rect.height - offsetY;
    if (top < 8) top = y + offsetY;
    if (left + rect.width > window.innerWidth - 8) {
      left = x - rect.width - offsetX;
    }
    if (left < 8) left = 8;
    setPos({ left, top });
  }, [x, y, spawn.spawnId]);

  return (
    <div
      ref={ref}
      className="mdt-hover-tooltip"
      style={{
        left: pos?.left ?? x + 14,
        top: pos?.top ?? y - 80,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <img
          src={portraitUrl}
          alt=""
          className="w-9 h-9 rounded border border-wow-border shrink-0 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
        <div className="min-w-0">
          <div className="font-semibold text-wow-gold text-sm leading-tight truncate">
            {spawn.name}
          </div>
          {creatureType && (
            <div className="text-wow-text-secondary text-[11px] leading-tight mt-0.5">
              {creatureType}{spawn.isBoss ? ' · Boss' : ''}
            </div>
          )}
        </div>
      </div>
      <div className="text-wow-text-secondary text-xs leading-relaxed space-y-0.5">
        {perMobForces != null && <div>{perMobForces} forces</div>}
        {health != null && <div>{formatHealth(health)} HP</div>}
        {packSize > 1 && <div>Pack of {packSize}</div>}
        {spawn.pullIndex != null && (
          <div
            className="font-semibold"
            style={{ color: spawn.pullColor ? `#${spawn.pullColor}` : undefined }}
          >
            Pull {spawn.pullIndex}
          </div>
        )}
      </div>
    </div>
  );
}

function formatHealth(h: number): string {
  if (h >= 1_000_000) return `${(h / 1_000_000).toFixed(1)}M`;
  if (h >= 1000) return `${(h / 1000).toFixed(0)}K`;
  return String(h);
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
  const opacity = 1;
  const grayscale = inPull ? 0 : 0.6;
  const portraitUrl = `/npc_portraits/${spawn.npcId}.png`;

  const classes = [
    'mdt-mob-icon',
    selected ? 'mdt-mob-icon--selected' : '',
    spawn.isBoss ? 'mdt-mob-icon--boss mdt-mob-icon--boss-diamond' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const groupAttr = spawn.group != null ? ` data-spawn-group="${spawn.group}"` : '';
  const html = `
    <div class="${classes}"${groupAttr} style="
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

/** Builds a sticky-note pin icon for a map note. The first ~24 chars of the
 *  note text are baked in as an `aria-label` so screen readers can read it
 *  without needing a tooltip-open. */
function buildNoteIcon(text: string) {
  const size = 26;
  const safe = text.replace(/[<>&"']/g, '');
  const html = `
    <div class="mdt-note-icon" title="${safe.slice(0, 60)}" aria-label="${safe.slice(0, 80)}">
      <span>!</span>
    </div>
  `;
  return divIcon({
    html,
    className: 'mdt-note-icon-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Builds the small numeric badge placed at a pull's centroid. */
function buildPullBadge(pullIndex: number, color: string, selected: boolean) {
  const size = selected ? 40 : 34;
  const classes = [
    'mdt-pull-badge',
    selected ? 'mdt-pull-badge--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const html = `
    <div class="${classes}" style="--badge-color: #${color};">${pullIndex}</div>
  `;
  return divIcon({
    html,
    className: 'mdt-pull-badge-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Ensures the map refits its view when the dungeon or container size changes. */
function FitToBounds({
  bounds,
  dungeonKey,
  expanded,
  animating,
}: {
  bounds: LatLngBoundsExpression;
  dungeonKey: string;
  expanded: boolean;
  animating: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    // During the close animation the container is still at its expanded size —
    // refitting now would shift the map view while it's fading out. Wait until
    // the animation ends (animating → false) so the container has actually
    // resized before we recalculate.
    if (animating && !expanded) return;

    const timer = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [-40, -40] });
    }, 50);
    return () => clearTimeout(timer);
  }, [map, bounds, dungeonKey, expanded, animating]);
  return null;
}

/** Refits the map to its default bounds whenever `trigger` changes. */
function ResetView({
  bounds,
  trigger,
}: {
  bounds: LatLngBoundsExpression;
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (trigger === 0) return;
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [-40, -40] });
  }, [map, bounds, trigger]);
  return null;
}

/** Pan-to-pull: when the parent bumps focusPull.nonce, pan the map to the
 *  pull's centroid without changing zoom — users pick their own zoom level. */
function FocusPullView({
  spawns,
  request,
}: {
  spawns: MdtSpawnMarker[];
  request: FocusPullRequest | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!request) return;
    const points = spawns
      .filter((s) => s.pullIndex === request.pullIndex)
      .map((s) => s.pos);
    if (points.length === 0) return;
    const center = centroidOf(points);
    map.panTo(center as LatLngExpression, { animate: true });
    // Intentionally only watch nonce — pullIndex alone shouldn't retrigger
    // on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce]);
  return null;
}

/** Adds a CSS class to every mob icon in the hovered group so pack-mates
 *  highlight together. Implemented via direct DOM mutation to avoid
 *  re-rendering hundreds of React markers on every hover. */
function PackHoverHighlighter({ group }: { group: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (group == null) return;
    const container = map.getContainer();
    const els = container.querySelectorAll(`[data-spawn-group="${group}"]`);
    els.forEach((el) => el.classList.add('mdt-mob-icon--pack-hover'));
    return () => {
      els.forEach((el) => el.classList.remove('mdt-mob-icon--pack-hover'));
    };
  }, [group, map]);
  return null;
}

/** Updates a CSS variable on the map container so mob icons scale with zoom. */
function ZoomScaleTracker() {
  const map = useMap();
  useEffect(() => {
    function update() {
      const zoom = map.getZoom();
      // Dampened power-of-2 scale: at native zoom 2 → 1×, zoom 3 → ~1.27×, etc.
      const scale = Math.pow(2, (zoom - 2) * 0.35);
      map.getContainer().style.setProperty('--zoom-scale', String(scale));
    }
    update();
    map.on('zoom', update);
    return () => { map.off('zoom', update); };
  }, [map]);
  return null;
}

/** Live cursor coordinate readout in the bottom-left of the map. Useful for
 *  debugging routes and matches threechest's overlay. The DOM node is
 *  mutated directly so cursor moves don't re-render the React tree. */
function CursorCoordsReadout() {
  const ref = useRef<HTMLDivElement>(null);
  useMapEvents({
    mousemove: (e) => {
      if (!ref.current) return;
      ref.current.textContent = `${e.latlng.lat.toFixed(1)}, ${e.latlng.lng.toFixed(1)}`;
    },
    mouseout: () => {
      if (!ref.current) return;
      ref.current.textContent = '';
    },
  });
  return <div ref={ref} className="mdt-coords-readout" />;
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

/** Mean-of-points centroid. Good enough for pull badge placement; the convex
 *  hull's centroid would be more accurate but the difference is invisible at
 *  the typical pack scale. */
function centroidOf(points: Array<[number, number]>): [number, number] {
  if (points.length === 0) return [0, 0];
  let lat = 0;
  let lng = 0;
  for (const [a, b] of points) {
    lat += a;
    lng += b;
  }
  return [lat / points.length, lng / points.length];
}
