import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal } from 'antd';
import { decodeMdtString } from '../lib/mdt/decodeRoute';
import { parseMdtRoute } from '../lib/mdt/parseRoute';
import { encodeMdtRoute } from '../lib/mdt/encodeRoute';
import {
  addNote,
  addPull,
  createEmptyRoute,
  parseSpawnId,
  removeNote,
  removePull,
  renameRoute,
  reorderPull,
  toggleGroupInPull,
  toggleSpawnInPull,
  updateNote,
} from '../lib/mdt/buildRoute';
import {
  MdtDecodeError,
  type MdtDungeonEnemy,
  type MdtDungeonTable,
  type MdtPullEnemy,
  type MdtSpawnMarker,
  type ParsedMdtRoute,
  type RawMdtRoute,
} from '../lib/mdt/types';
import { zoneSpellsByInstanceSlug } from '../data';
import { NpcGroup } from '../components/zone-spells/ZoneSpellSection';
import DungeonMap, { type FocusPullRequest } from '../components/mdt/DungeonMap';
import DungeonPicker from '../components/mdt/DungeonPicker';
import RouteBuilderControls from '../components/mdt/RouteBuilderControls';
import RouteLandingView from '../components/mdt/RouteLandingView';
import RouteEditorHeader from '../components/mdt/RouteEditorHeader';
import MobInfoPanel from '../components/mdt/MobInfoPanel';
import { useSavedMdtRoutes, type SavedMdtRoute } from '../hooks/useSavedMdtRoutes';
import { useMdtKeybindings } from '../hooks/useMdtKeybindings';
import { useLayout } from '../context/LayoutContext';
import type { ZoneNpc } from '../types';

interface ErrorState {
  message: string;
}

const HISTORY_LIMIT = 50;

export default function MdtRoutePage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState<ErrorState | null>(null);
  // Single source of truth for a loaded route — whether it came from an
  // import, a fresh build, or a saved entry. Everything else (rendered
  // pulls, forces, spawn colors) derives from this.
  const [rawRoute, setRawRoute] = useState<RawMdtRoute | null>(null);
  const [selectedPullIndex, setSelectedPullIndex] = useState<number | null>(null);
  // Undo/redo: every applyEdit pushes the previous rawRoute onto pastRoutes
  // and clears futureRoutes. Caps at HISTORY_LIMIT so we don't grow forever.
  const [pastRoutes, setPastRoutes] = useState<RawMdtRoute[]>([]);
  const [futureRoutes, setFutureRoutes] = useState<RawMdtRoute[]>([]);
  // The last MDT string matching the current rawRoute: either the string we
  // imported from, or the one we last saved. Cleared on every edit so the
  // Save button becomes re-enabled.
  const [savedMdtString, setSavedMdtString] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Bumped each time the sidebar selects a pull, so the map zooms to fit it.
  const [focusPull, setFocusPull] = useState<FocusPullRequest | null>(null);
  // Spawn whose detail panel is currently shown (shift-click).
  const [mobInfoSpawn, setMobInfoSpawn] = useState<MdtSpawnMarker | null>(null);
  const { routes: savedRoutes, save, remove, isSaved } = useSavedMdtRoutes();

  const route: ParsedMdtRoute | null = useMemo(() => {
    if (!rawRoute) return null;
    try {
      return parseMdtRoute(rawRoute);
    } catch {
      return null;
    }
  }, [rawRoute]);

  // Opt the layout into wide mode only while the route editor is showing.
  // The landing/picker views look better at the standard reading width.
  const { setWide } = useLayout();
  useEffect(() => {
    setWide(route != null);
    return () => setWide(false);
  }, [route, setWide]);

  // Keep Pull 1 selected by default: if a route is loaded with pulls but
  // nothing is selected (or the selection fell out of range after an edit),
  // snap back to pull 1 so map clicks always have a target pull.
  useEffect(() => {
    if (!route || route.pulls.length === 0) return;
    if (
      selectedPullIndex == null ||
      !route.pulls.some((p) => p.index === selectedPullIndex)
    ) {
      setSelectedPullIndex(1);
    }
  }, [route, selectedPullIndex]);

  // If the route changes such that the panel's spawn is no longer present
  // (e.g. dungeon swapped), close the panel.
  useEffect(() => {
    if (!mobInfoSpawn || !route) return;
    const stillExists = route.spawnMarkers.some((s) => s.spawnId === mobInfoSpawn.spawnId);
    if (!stillExists) setMobInfoSpawn(null);
  }, [route, mobInfoSpawn]);

  const zoneSpells = useMemo(
    () => (route ? zoneSpellsByInstanceSlug.get(route.dungeon.instanceSlug) : undefined),
    [route],
  );

  const npcsById = useMemo(() => {
    const map = new Map<number, ZoneNpc>();
    if (zoneSpells) for (const npc of zoneSpells.npcs) map.set(npc.id, npc);
    return map;
  }, [zoneSpells]);

  // For the mob info panel and tooltip, we want O(1) access to the dungeon
  // table entry for any spawn's NPC id.
  const enemyByNpcId = useMemo(() => {
    const m = new Map<number, MdtDungeonEnemy>();
    if (route) for (const e of route.dungeon.enemies) m.set(e.id, e);
    return m;
  }, [route]);

  // Most recent spawn marker for the open detail panel. We re-resolve from
  // the current route so the panel reflects pull-membership changes live.
  const liveMobInfoSpawn = useMemo(() => {
    if (!mobInfoSpawn || !route) return null;
    return route.spawnMarkers.find((s) => s.spawnId === mobInfoSpawn.spawnId) ?? mobInfoSpawn;
  }, [mobInfoSpawn, route]);

  function decodeAndDisplay(mdtString: string): boolean {
    setError(null);
    try {
      const raw = decodeMdtString(mdtString);
      const parsed = parseMdtRoute(raw); // validates dungeon known
      setRawRoute(raw);
      setSavedMdtString(mdtString.trim());
      setSelectedPullIndex(parsed.pulls.length > 0 ? 1 : null);
      setPastRoutes([]);
      setFutureRoutes([]);
      setMobInfoSpawn(null);
      setPicking(false);
      return true;
    } catch (err) {
      setRawRoute(null);
      setSavedMdtString(null);
      setSelectedPullIndex(null);
      setPastRoutes([]);
      setFutureRoutes([]);
      setMobInfoSpawn(null);
      if (err instanceof MdtDecodeError) {
        setError({ message: err.message });
      } else {
        setError({ message: `Unexpected error: ${(err as Error).message}` });
      }
      return false;
    }
  }

  function handleImport() {
    const ok = decodeAndDisplay(input);
    if (ok) setImportOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleImport();
    }
  }

  function handleOpenImport() {
    setError(null);
    setImportOpen(true);
  }

  function handleCloseImport() {
    setImportOpen(false);
    setError(null);
  }

  function handleSave() {
    if (!rawRoute || !route) return;
    const mdtString = encodeMdtRoute(rawRoute);
    save({
      name: route.title,
      dungeonName: route.dungeon.displayName,
      mdtString,
    });
    setSavedMdtString(mdtString);
  }

  function handleLoadSaved(saved: SavedMdtRoute) {
    setInput(saved.mdtString);
    decodeAndDisplay(saved.mdtString);
  }

  function handleStartPicker() {
    setError(null);
    setPicking(true);
  }

  function handlePickDungeon(dungeon: MdtDungeonTable) {
    const fresh = createEmptyRoute(dungeon, 'New route');
    setRawRoute(fresh);
    setSavedMdtString(null);
    setSelectedPullIndex(1);
    setPastRoutes([]);
    setFutureRoutes([]);
    setMobInfoSpawn(null);
    setPicking(false);
  }

  function handleCancelPicker() {
    setPicking(false);
  }

  function handleCloseRoute() {
    setRawRoute(null);
    setSavedMdtString(null);
    setSelectedPullIndex(null);
    setPastRoutes([]);
    setFutureRoutes([]);
    setMobInfoSpawn(null);
  }

  // Push the current rawRoute onto the undo stack and apply the new state.
  // Wraps every mutation so undo always sees a coherent history.
  const applyEdit = useCallback(
    (next: RawMdtRoute) => {
      setRawRoute((prev) => {
        if (prev) {
          setPastRoutes((past) => {
            const trimmed = past.length >= HISTORY_LIMIT ? past.slice(-(HISTORY_LIMIT - 1)) : past;
            return [...trimmed, prev];
          });
        }
        return next;
      });
      setFutureRoutes([]);
      // Any edit invalidates the last-saved string so the Save button re-enables.
      setSavedMdtString(null);
    },
    [],
  );

  const handleUndo = useCallback(() => {
    setPastRoutes((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      setRawRoute((current) => {
        if (current) setFutureRoutes((future) => [...future, current]);
        return previous;
      });
      setSavedMdtString(null);
      return past.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFutureRoutes((future) => {
      if (future.length === 0) return future;
      const next = future[future.length - 1];
      setRawRoute((current) => {
        if (current) setPastRoutes((past) => [...past, current]);
        return next;
      });
      setSavedMdtString(null);
      return future.slice(0, -1);
    });
  }, []);

  function handleToggleSpawn(spawn: MdtSpawnMarker, info: { alt: boolean; shift: boolean }) {
    if (!rawRoute || selectedPullIndex == null || !route) return;
    const parts = parseSpawnId(spawn.spawnId);
    if (!parts) return;

    // Alt-click forces single-mob toggle even when the spawn has a group.
    // Solo mobs (group == null) always go through single toggle.
    if (info.alt || spawn.group == null) {
      applyEdit(toggleSpawnInPull(rawRoute, selectedPullIndex, parts.enemyIndex, parts.cloneIdx));
      return;
    }

    // Group toggle: collect every spawn marker that shares this group, then
    // remove the whole pack if the clicked mob is currently in the active
    // pull, otherwise add the whole pack into the active pull.
    const members = route.spawnMarkers
      .filter((m) => m.group === spawn.group)
      .map((m) => parseSpawnId(m.spawnId))
      .filter((p): p is { enemyIndex: number; cloneIdx: number } => p != null);
    if (members.length === 0) return;
    const removeMode = spawn.pullIndex === selectedPullIndex;
    applyEdit(toggleGroupInPull(rawRoute, selectedPullIndex, members, removeMode));
  }

  function handleMoveSpawnToPull(spawn: MdtSpawnMarker, pullIndex: number) {
    if (!rawRoute) return;
    const parts = parseSpawnId(spawn.spawnId);
    if (!parts) return;
    // toggleSpawnInPull moves a spawn between pulls when re-targeted.
    // If the spawn is already in the destination, this would remove it; we
    // explicitly want a move, so skip the no-op.
    if (spawn.pullIndex === pullIndex) return;
    applyEdit(toggleSpawnInPull(rawRoute, pullIndex, parts.enemyIndex, parts.cloneIdx));
  }

  function handleRemoveSpawn(spawn: MdtSpawnMarker) {
    if (!rawRoute || spawn.pullIndex == null) return;
    const parts = parseSpawnId(spawn.spawnId);
    if (!parts) return;
    applyEdit(toggleSpawnInPull(rawRoute, spawn.pullIndex, parts.enemyIndex, parts.cloneIdx));
  }

  const handleAddPull = useCallback(() => {
    if (!rawRoute) return;
    const next = addPull(rawRoute);
    applyEdit(next);
    // Jump to the newly added pull so the next click assigns into it.
    const newCount = (next.value?.pulls ?? []).length;
    setSelectedPullIndex(newCount);
  }, [rawRoute, applyEdit]);

  function handleRemovePull(pullIndex: number) {
    if (!rawRoute) return;
    const next = removePull(rawRoute, pullIndex);
    applyEdit(next);
    // Clamp the active pull so it still points at something valid.
    const remaining = (next.value?.pulls ?? []).length;
    if (remaining === 0) {
      setSelectedPullIndex(null);
    } else if (selectedPullIndex != null && selectedPullIndex > remaining) {
      setSelectedPullIndex(remaining);
    } else if (selectedPullIndex === pullIndex) {
      setSelectedPullIndex(Math.min(pullIndex, remaining));
    } else if (selectedPullIndex != null && selectedPullIndex > pullIndex) {
      // Pulls after the deleted one shifted down by 1.
      setSelectedPullIndex(selectedPullIndex - 1);
    }
  }

  function handleRename(title: string) {
    if (!rawRoute) return;
    applyEdit(renameRoute(rawRoute, title));
  }

  function handleAddNote(pos: [number, number], text: string) {
    if (!rawRoute) return;
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    applyEdit(addNote(rawRoute, { id, pos, text }));
  }

  function handleUpdateNote(id: string, text: string) {
    if (!rawRoute) return;
    applyEdit(updateNote(rawRoute, id, { text }));
  }

  function handleRemoveNote(id: string) {
    if (!rawRoute) return;
    applyEdit(removeNote(rawRoute, id));
  }

  function handleReorderPull(fromIdx: number, toIdx: number) {
    if (!rawRoute) return;
    if (fromIdx === toIdx) return;
    applyEdit(reorderPull(rawRoute, fromIdx, toIdx));
    // Keep the active pull pointing at the same physical pull after reorder.
    if (selectedPullIndex === fromIdx) {
      setSelectedPullIndex(toIdx);
    } else if (selectedPullIndex != null) {
      // Compute the new position of the previously-selected pull after the
      // splice. If it wasn't moved, its index may shift by one.
      let next = selectedPullIndex;
      if (fromIdx < toIdx && selectedPullIndex > fromIdx && selectedPullIndex <= toIdx) {
        next = selectedPullIndex - 1;
      } else if (fromIdx > toIdx && selectedPullIndex >= toIdx && selectedPullIndex < fromIdx) {
        next = selectedPullIndex + 1;
      }
      if (next !== selectedPullIndex) setSelectedPullIndex(next);
    }
  }

  // Sidebar select also bumps the focus trigger so the map zooms to the pull.
  const focusNonceRef = useRef(0);
  function handleSidebarSelectPull(pullIndex: number) {
    setSelectedPullIndex(pullIndex);
    focusNonceRef.current += 1;
    setFocusPull({ pullIndex, nonce: focusNonceRef.current });
  }

  // Keyboard shortcut: delete-active-pull (with no confirmation since undo
  // is one keystroke away).
  const handleDeleteActivePull = useCallback(() => {
    if (selectedPullIndex == null) return;
    handleRemovePull(selectedPullIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPullIndex, rawRoute]);

  useMdtKeybindings({
    enabled: route != null,
    pullCount: route?.pulls.length ?? 0,
    onSelectPull: handleSidebarSelectPull,
    onAddPull: handleAddPull,
    onDeleteActivePull: handleDeleteActivePull,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  const currentIsSaved = savedMdtString ? isSaved(savedMdtString) : false;

  const selectedPull =
    route && selectedPullIndex != null
      ? route.pulls.find((p) => p.index === selectedPullIndex) ?? null
      : null;

  return (
    <div>
      {!route && (
        <>
          <h2 className="text-xl sm:text-2xl font-semibold text-wow-gold mb-2 tracking-wide">
            M+ Route Helper
          </h2>
          <p className="text-wow-text-secondary mb-6 max-w-2xl">
            Build a Mythic+ pull plan from scratch or import a route exported
            from Mythic Dungeon Tools. Every route is editable: click a pull to
            make it active, then click mobs on the map to add or remove them.
          </p>

          {picking ? (
            <DungeonPicker onPick={handlePickDungeon} onCancel={handleCancelPicker} />
          ) : (
            <RouteLandingView
              savedRoutes={savedRoutes}
              currentMdtString={savedMdtString}
              onCreate={handleStartPicker}
              onImport={handleOpenImport}
              onLoadSaved={handleLoadSaved}
              onRemoveSaved={remove}
            />
          )}
        </>
      )}

      {route && (
        <>
          <RouteEditorHeader
            route={route}
            isSaved={currentIsSaved}
            onSave={handleSave}
            onClose={handleCloseRoute}
            onRename={handleRename}
          />

          <section className="mb-6">
            <DungeonMap
              dungeon={route.dungeon}
              spawns={route.spawnMarkers}
              pulls={route.pulls}
              notes={route.notes}
              selectedPullIndex={selectedPullIndex}
              focusPull={focusPull}
              onSelectPull={setSelectedPullIndex}
              onToggleSpawn={
                selectedPullIndex != null ? handleToggleSpawn : undefined
              }
              onShowMobInfo={setMobInfoSpawn}
              onMoveSpawnToPull={handleMoveSpawnToPull}
              onRemoveSpawn={handleRemoveSpawn}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onRemoveNote={handleRemoveNote}
              sidebar={
                <RouteBuilderControls
                  pulls={route.pulls}
                  activePullIndex={selectedPullIndex}
                  totalCount={route.dungeon.totalCount}
                  onSelectPull={handleSidebarSelectPull}
                  onAddPull={handleAddPull}
                  onRemovePull={handleRemovePull}
                  onReorderPull={handleReorderPull}
                  canUndo={pastRoutes.length > 0}
                  canRedo={futureRoutes.length > 0}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                />
              }
            />
          </section>

          {liveMobInfoSpawn && (
            <section className="mb-6">
              <MobInfoPanel
                spawn={liveMobInfoSpawn}
                enemy={enemyByNpcId.get(liveMobInfoSpawn.npcId)}
                npcsById={npcsById}
                onClose={() => setMobInfoSpawn(null)}
              />
            </section>
          )}

          <div>
            {selectedPull ? (
              <PullDetail
                pull={selectedPull}
                npcsById={npcsById}
              />
            ) : (
              <p className="text-sm text-wow-text-secondary">
                {route.pulls.length === 0
                  ? 'Add a pull and then click mobs on the map to fill it.'
                  : 'Select a pull to view and edit its mobs.'}
              </p>
            )}
          </div>
        </>
      )}

      <Modal
        title="Import MDT route"
        open={importOpen}
        onCancel={handleCloseImport}
        footer={null}
        width={560}
        destroyOnHidden
        // Aligned roughly with the "Saved routes" heading on the landing
        // page so the modal feels anchored to the same vertical region the
        // user was already looking at.
        style={{ top: 304 }}
      >
        <p className="text-sm text-wow-text-secondary mt-0 mb-3">
          Paste a route export from the MDT addon's <span className="text-wow-text">Share</span> &rarr; <span className="text-wow-text">Export</span> button.
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="!WA:2!..."
          rows={4}
          className="w-full rounded-lg border border-wow-border bg-wow-bg-elevated px-3 py-2 text-xs font-mono text-wow-text placeholder:text-wow-text-dim focus:outline-none focus:border-wow-gold-muted"
          spellCheck={false}
          autoFocus
        />
        <div className="mt-3 flex items-center flex-wrap gap-3">
          <Button type="primary" onClick={handleImport} disabled={!input.trim()}>
            Import route
          </Button>
          <Button onClick={handleCloseImport}>Cancel</Button>
          <span className="ml-auto text-xs text-wow-text-dim">
            <kbd className="text-[10px] text-wow-text-dim bg-wow-bg-raised px-1.5 py-0.5 rounded border border-wow-border mr-1">
              {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
            </kbd>
            to import
          </span>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error.message}
          </div>
        )}
      </Modal>
    </div>
  );
}

interface PullDetailProps {
  pull: { index: number; forces: number; enemies: MdtPullEnemy[] };
  npcsById: Map<number, ZoneNpc>;
}

function PullDetail({ pull, npcsById }: PullDetailProps) {
  if (pull.enemies.length === 0) {
    return (
      <p className="text-sm text-wow-text-secondary">
        Pull {pull.index} has no enemies yet.
      </p>
    );
  }
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary mb-3">
        Pull {pull.index}
      </h4>
      <div>
        {pull.enemies.map((enemy) => {
          const existing = npcsById.get(enemy.npcId);
          const npc: ZoneNpc = existing ?? {
            id: enemy.npcId,
            name: enemy.name,
            classification: enemy.isBoss ? 3 : 1,
            spells: [],
          };
          return (
            <NpcGroup
              key={`${pull.index}-${enemy.npcId}`}
              npc={npc}
              isBoss={enemy.isBoss}
              countBadge={enemy.cloneCount}
              fallbackNote={
                existing
                  ? undefined
                  : 'No abilities recorded for this NPC in WarcraftJournal.'
              }
            />
          );
        })}
      </div>
    </div>
  );
}
