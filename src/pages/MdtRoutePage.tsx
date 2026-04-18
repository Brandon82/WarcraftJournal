import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal, Select } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
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
import {
  getEncountersForInstance,
  raiderioRoutes,
  zoneSpellsByInstanceSlug,
  type RaiderIORoute,
} from '../data';
import { NpcGroup } from '../components/zone-spells/ZoneSpellSection';
import DungeonMap, { type FocusPullRequest } from '../components/mdt/DungeonMap';
import DungeonPicker from '../components/mdt/DungeonPicker';
import RouteBuilderControls from '../components/mdt/RouteBuilderControls';
import RouteLandingView from '../components/mdt/RouteLandingView';
import RouteEditorHeader from '../components/mdt/RouteEditorHeader';
import MobInfoPanel from '../components/mdt/MobInfoPanel';
import { useSavedMdtRoutes, type SavedMdtRoute } from '../hooks/useSavedMdtRoutes';
import { useMdtKeybindings } from '../hooks/useMdtKeybindings';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLayout } from '../context/LayoutContext';
import type { ZoneNpc } from '../types';

interface ErrorState {
  message: string;
}

const HISTORY_LIMIT = 50;

type AbilityListMode = 'current' | 'all-pulls' | 'dungeon';

const ABILITY_LIST_OPTIONS: { value: AbilityListMode; label: string }[] = [
  { value: 'current', label: 'Current pull' },
  { value: 'all-pulls', label: 'All pulls' },
  { value: 'dungeon', label: 'All mobs in dungeon' },
];

export default function MdtRoutePage() {
  const [input, setInput] = useState('');
  // Import modal's route-name field. Auto-fills with the decoded dungeon
  // name (see the effect below), but the user can override.
  const [importName, setImportName] = useState('');
  const [importNameTouched, setImportNameTouched] = useState(false);
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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportString, setExportString] = useState('');
  const [exportCopied, setExportCopied] = useState(false);
  // Bumped each time the sidebar selects a pull, so the map zooms to fit it.
  const [focusPull, setFocusPull] = useState<FocusPullRequest | null>(null);
  // Spawn whose detail panel is currently shown (shift-click).
  const [mobInfoSpawn, setMobInfoSpawn] = useState<MdtSpawnMarker | null>(null);
  const [abilityListMode, setAbilityListMode] = useState<AbilityListMode>('all-pulls');
  const { routes: savedRoutes, save, remove, isSaved } = useSavedMdtRoutes();
  const isMobile = useIsMobile();

  // Pre-scraped top raider.io routes, one per current-season dungeon. Keyed
  // by our internal instance slug — see scripts/fetch-raiderio-routes.ts.
  const featuredRoutes = useMemo(
    () =>
      Object.entries(raiderioRoutes).map(([instanceSlug, route]) => ({
        instanceSlug,
        route,
      })),
    [],
  );

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

  // Used by the "All mobs in dungeon" ability list mode so NPCs that appear
  // as encounter bosses get the Boss classification badge.
  const bossNames = useMemo(() => {
    if (!route) return new Set<string>();
    const encounters = getEncountersForInstance(route.dungeon.instanceSlug);
    return new Set(encounters.flatMap((e) => e.creatures.map((c) => c.name)));
  }, [route]);

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

  // Silent preview decode so the name field can auto-fill with the dungeon
  // name as soon as the user finishes pasting. Any decode error is swallowed
  // here; the real error surfacing happens in handleImport.
  const importPreview = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      const raw = decodeMdtString(trimmed);
      const parsed = parseMdtRoute(raw);
      return { raw, parsed };
    } catch {
      return null;
    }
  }, [input]);

  useEffect(() => {
    if (importNameTouched) return;
    setImportName(importPreview?.parsed.dungeon.displayName ?? '');
  }, [importPreview, importNameTouched]);

  function handleImport() {
    setError(null);
    let preview = importPreview;
    if (!preview) {
      // Re-run decode so the user sees a real error message.
      try {
        const raw = decodeMdtString(input);
        const parsed = parseMdtRoute(raw);
        preview = { raw, parsed };
      } catch (err) {
        if (err instanceof MdtDecodeError) {
          setError({ message: err.message });
        } else {
          setError({ message: `Unexpected error: ${(err as Error).message}` });
        }
        return;
      }
    }
    const { raw, parsed } = preview;
    const finalName = importName.trim() || parsed.dungeon.displayName;
    const renamed = renameRoute(raw, finalName);
    const encoded = encodeMdtRoute(renamed);
    setRawRoute(renamed);
    setSavedMdtString(encoded);
    setSelectedPullIndex(parsed.pulls.length > 0 ? 1 : null);
    setPastRoutes([]);
    setFutureRoutes([]);
    setMobInfoSpawn(null);
    setPicking(false);
    save({
      name: finalName,
      dungeonName: parsed.dungeon.displayName,
      mdtString: encoded,
    });
    setImportOpen(false);
    setInput('');
    setImportName('');
    setImportNameTouched(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleImport();
    }
  }

  function handleOpenImport() {
    setError(null);
    setInput('');
    setImportName('');
    setImportNameTouched(false);
    setImportOpen(true);
  }

  function handleCloseImport() {
    setImportOpen(false);
    setError(null);
    setInput('');
    setImportName('');
    setImportNameTouched(false);
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

  function handleOpenExport() {
    if (!rawRoute) return;
    setExportString(encodeMdtRoute(rawRoute));
    setExportCopied(false);
    setExportOpen(true);
  }

  function handleCloseExport() {
    setExportOpen(false);
    setExportCopied(false);
  }

  async function handleCopyExport() {
    try {
      await navigator.clipboard.writeText(exportString);
      setExportCopied(true);
    } catch {
      // Clipboard API can fail in non-secure contexts; the textarea is
      // selectable so the user can still copy manually.
    }
  }

  function handleLoadSaved(saved: SavedMdtRoute) {
    setInput(saved.mdtString);
    decodeAndDisplay(saved.mdtString);
  }

  function handleLoadFeatured(featured: RaiderIORoute) {
    setInput(featured.mdtString);
    decodeAndDisplay(featured.mdtString);
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

  // Clicking a pull header in the abilities list: select + focus the pull
  // on the map, then scroll the map into view so the user doesn't lose
  // context when the abilities list is long.
  function handleAbilityPullClick(pullIndex: number) {
    handleSidebarSelectPull(pullIndex);
    window.scrollTo(0, 0);
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
            M+ Routes
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
              featuredRoutes={featuredRoutes}
              currentMdtString={savedMdtString}
              onCreate={handleStartPicker}
              onImport={handleOpenImport}
              onLoadSaved={handleLoadSaved}
              onLoadFeatured={handleLoadFeatured}
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
            onExport={handleOpenExport}
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
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 className="text-lg font-semibold text-wow-gold m-0 tracking-wide">
                Abilities
              </h3>
              <Select
                value={abilityListMode}
                onChange={setAbilityListMode}
                options={ABILITY_LIST_OPTIONS}
                size="small"
                style={{ minWidth: 200 }}
              />
            </div>
            {abilityListMode === 'current' && (
              selectedPull ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      size="small"
                      icon={<LeftOutlined />}
                      onClick={() => setSelectedPullIndex(selectedPull.index - 1)}
                      disabled={selectedPull.index <= 1}
                    >
                      Prev
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setSelectedPullIndex(selectedPull.index + 1)}
                      disabled={selectedPull.index >= route.pulls.length}
                    >
                      Next
                      <RightOutlined />
                    </Button>
                    <span className="text-xs text-wow-text-dim ml-1">
                      {selectedPull.index} / {route.pulls.length}
                    </span>
                  </div>
                  <PullDetail pull={selectedPull} npcsById={npcsById} />
                </>
              ) : (
                <p className="text-sm text-wow-text-secondary">
                  {route.pulls.length === 0
                    ? 'Add a pull and then click mobs on the map to fill it.'
                    : 'Select a pull to view and edit its mobs.'}
                </p>
              )
            )}
            {abilityListMode === 'all-pulls' && (
              route.pulls.length === 0 ? (
                <p className="text-sm text-wow-text-secondary">
                  Add a pull and then click mobs on the map to fill it.
                </p>
              ) : (
                <div>
                  {route.pulls.map((pull) => (
                    <PullDetail
                      key={pull.index}
                      pull={pull}
                      npcsById={npcsById}
                      onHeaderClick={() => handleAbilityPullClick(pull.index)}
                    />
                  ))}
                </div>
              )
            )}
            {abilityListMode === 'dungeon' && (
              zoneSpells && zoneSpells.npcs.length > 0 ? (
                <DungeonAbilityList npcs={zoneSpells.npcs} bossNames={bossNames} />
              ) : (
                <p className="text-sm text-wow-text-secondary">
                  No dungeon abilities recorded for this instance.
                </p>
              )
            )}
          </div>
        </>
      )}

      <Modal
        title="Import MDT route"
        open={importOpen}
        onCancel={handleCloseImport}
        footer={null}
        width={isMobile ? '92vw' : 560}
        destroyOnHidden
        // On desktop, anchor the modal roughly at the "Saved routes" heading
        // so it feels tied to the vertical region the user was looking at.
        // On mobile, center it so the on-screen keyboard doesn't push it
        // out of view.
        centered={isMobile}
        style={isMobile ? undefined : { top: 304 }}
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
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-wow-text-secondary mb-1">
          Route name
        </label>
        <Input
          value={importName}
          onChange={(e) => {
            setImportName(e.target.value);
            setImportNameTouched(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleImport();
            }
          }}
          placeholder={importPreview?.parsed.dungeon.displayName ?? 'Defaults to dungeon name'}
        />
        <div className="mt-3 flex items-center flex-wrap gap-3">
          <Button type="primary" onClick={handleImport} disabled={!input.trim()}>
            Import &amp; save
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

      <Modal
        title="Export MDT route"
        open={exportOpen}
        onCancel={handleCloseExport}
        footer={null}
        width={isMobile ? '92vw' : 560}
        destroyOnHidden
        centered={isMobile}
        style={isMobile ? undefined : { top: 304 }}
      >
        <p className="text-sm text-wow-text-secondary mt-0 mb-3">
          Copy this string and paste it into the MDT addon's <span className="text-wow-text">Share</span> &rarr; <span className="text-wow-text">Import</span> dialog.
        </p>
        <textarea
          value={exportString}
          readOnly
          rows={4}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-wow-border bg-wow-bg-elevated px-3 py-2 text-xs font-mono text-wow-text focus:outline-none focus:border-wow-gold-muted"
          spellCheck={false}
        />
        <div className="mt-3 flex items-center flex-wrap gap-3">
          <Button type="primary" onClick={handleCopyExport}>
            {exportCopied ? 'Copied!' : 'Copy to clipboard'}
          </Button>
          <Button onClick={handleCloseExport}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}

interface DungeonAbilityListProps {
  npcs: ZoneNpc[];
  bossNames: Set<string>;
}

// Mirrors ZoneSpellSection's sort (boss > elite/rare-elite > other, then name)
// but without the outer "Dungeon Abilities" heading since the page already
// has its own Abilities header and mode selector.
function DungeonAbilityList({ npcs, bossNames }: DungeonAbilityListProps) {
  const isBoss = (npc: ZoneNpc) => bossNames.has(npc.name) || npc.classification === 3;
  const sortedNpcs = useMemo(() => {
    return [...npcs].sort((a, b) => {
      const tierA = isBoss(a) ? 0 : a.classification >= 1 ? 1 : 2;
      const tierB = isBoss(b) ? 0 : b.classification >= 1 ? 1 : 2;
      if (tierA !== tierB) return tierA - tierB;
      return a.name.localeCompare(b.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcs, bossNames]);
  return (
    <div>
      {sortedNpcs.map((npc) => (
        <NpcGroup key={npc.id} npc={npc} isBoss={isBoss(npc)} />
      ))}
    </div>
  );
}

interface PullDetailProps {
  pull: { index: number; forces: number; enemies: MdtPullEnemy[] };
  npcsById: Map<number, ZoneNpc>;
  onHeaderClick?: () => void;
}

function PullDetail({ pull, npcsById, onHeaderClick }: PullDetailProps) {
  if (pull.enemies.length === 0) {
    const emptyText = `Pull ${pull.index} has no enemies yet.`;
    return onHeaderClick ? (
      <button
        type="button"
        onClick={onHeaderClick}
        className="block text-left text-sm text-wow-text-secondary mb-3 bg-transparent border-0 p-0 cursor-pointer hover:text-wow-gold transition-colors"
      >
        {emptyText}
      </button>
    ) : (
      <p className="text-sm text-wow-text-secondary">{emptyText}</p>
    );
  }
  const headerLabel = `Pull ${pull.index}`;
  return (
    <div>
      {onHeaderClick ? (
        <button
          type="button"
          onClick={onHeaderClick}
          className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary mb-3 bg-transparent border-0 p-0 cursor-pointer hover:text-wow-gold transition-colors"
        >
          {headerLabel}
        </button>
      ) : (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary mb-3">
          {headerLabel}
        </h4>
      )}
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
