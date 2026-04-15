import { useMemo, useState } from 'react';
import { Button, Popconfirm } from 'antd';
import { DeleteOutlined, SaveOutlined, CheckOutlined } from '@ant-design/icons';
import { decodeMdtString } from '../lib/mdt/decodeRoute';
import { parseMdtRoute } from '../lib/mdt/parseRoute';
import { MdtDecodeError, type ParsedMdtRoute, type MdtPullEnemy } from '../lib/mdt/types';
import { zoneSpellsByInstanceSlug } from '../data';
import { NpcGroup } from '../components/zone-spells/ZoneSpellSection';
import DungeonMap from '../components/mdt/DungeonMap';
import { useSavedMdtRoutes, type SavedMdtRoute } from '../hooks/useSavedMdtRoutes';
import type { ZoneNpc } from '../types';

interface ErrorState {
  message: string;
}

export default function MdtRoutePage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState<ErrorState | null>(null);
  const [route, setRoute] = useState<ParsedMdtRoute | null>(null);
  const [loadedMdtString, setLoadedMdtString] = useState<string | null>(null);
  const [selectedPullIndex, setSelectedPullIndex] = useState<number | null>(null);
  const { routes: savedRoutes, save, remove, isSaved } = useSavedMdtRoutes();

  const zoneSpells = useMemo(
    () => (route ? zoneSpellsByInstanceSlug.get(route.dungeon.instanceSlug) : undefined),
    [route],
  );

  const npcsById = useMemo(() => {
    const map = new Map<number, ZoneNpc>();
    if (zoneSpells) for (const npc of zoneSpells.npcs) map.set(npc.id, npc);
    return map;
  }, [zoneSpells]);

  function decodeAndDisplay(mdtString: string): boolean {
    setError(null);
    setRoute(null);
    setLoadedMdtString(null);
    setSelectedPullIndex(null);
    try {
      const raw = decodeMdtString(mdtString);
      const parsed = parseMdtRoute(raw);
      setRoute(parsed);
      setLoadedMdtString(mdtString.trim());
      setSelectedPullIndex(parsed.pulls.length > 0 ? 1 : null);
      return true;
    } catch (err) {
      if (err instanceof MdtDecodeError) {
        setError({ message: err.message });
      } else {
        setError({ message: `Unexpected error: ${(err as Error).message}` });
      }
      return false;
    }
  }

  function handleImport() {
    decodeAndDisplay(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleImport();
    }
  }

  function handleSaveCurrent() {
    if (!route || !loadedMdtString) return;
    save({
      name: route.title,
      dungeonName: route.dungeon.displayName,
      mdtString: loadedMdtString,
    });
  }

  function handleLoadSaved(saved: SavedMdtRoute) {
    setInput(saved.mdtString);
    decodeAndDisplay(saved.mdtString);
  }

  const currentIsSaved = loadedMdtString ? isSaved(loadedMdtString) : false;

  const selectedPull =
    route && selectedPullIndex != null
      ? route.pulls.find((p) => p.index === selectedPullIndex) ?? null
      : null;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-wow-gold mb-2 tracking-wide">
        M+ Route Helper
      </h2>
      <p className="text-wow-text-secondary mb-6 max-w-2xl">
        Paste a Mythic Dungeon Tools export string (from the addon's{' '}
        <span className="text-wow-text">Share</span> &rarr;{' '}
        <span className="text-wow-text">Export</span> button). Click a pull to see every mob in it
        and the abilities you need to watch for.
      </p>

      <div className="mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="!WA:2!..."
          rows={3}
          className="w-full rounded-lg border border-wow-border bg-wow-bg-elevated px-3 py-2 text-xs font-mono text-wow-text placeholder:text-wow-text-dim focus:outline-none focus:border-wow-gold-muted"
          spellCheck={false}
        />
        <div className="mt-2 flex items-center flex-wrap gap-3">
          <Button type="primary" onClick={handleImport} disabled={!input.trim()}>
            Import route
          </Button>
          {route && loadedMdtString && (
            <Button
              onClick={handleSaveCurrent}
              disabled={currentIsSaved}
              icon={currentIsSaved ? <CheckOutlined /> : <SaveOutlined />}
            >
              {currentIsSaved ? 'Saved' : 'Save route'}
            </Button>
          )}
          <span className="text-xs text-wow-text-dim">Ctrl/&#8984;+Enter to import</span>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error.message}
          </div>
        )}
      </div>

      {savedRoutes.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary mb-2">
            Saved routes
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {savedRoutes.map((saved) => {
              const isCurrent = loadedMdtString === saved.mdtString;
              return (
                <div
                  key={saved.id}
                  className={`group relative rounded-lg border px-3 py-2 transition-colors duration-150 ${
                    isCurrent
                      ? 'border-wow-gold-muted bg-wow-bg-elevated'
                      : 'border-wow-border bg-wow-bg-surface hover:border-wow-gold-muted/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleLoadSaved(saved)}
                    className="block w-full text-left pr-7"
                  >
                    <div className="font-semibold text-sm text-wow-gold truncate">
                      {saved.name}
                    </div>
                    <div className="text-xs text-wow-text-secondary truncate">
                      {saved.dungeonName}
                    </div>
                  </button>
                  <Popconfirm
                    title="Delete this saved route?"
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => remove(saved.id)}
                  >
                    <button
                      type="button"
                      aria-label={`Delete ${saved.name}`}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-wow-text-dim hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {route && (
        <div className="rounded-xl border border-wow-border bg-wow-bg-surface p-4 mb-6">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="text-lg font-semibold text-wow-gold m-0">{route.title}</h3>
            <span className="text-wow-text-secondary text-sm">{route.dungeon.displayName}</span>
          </div>
          <div className="mt-2 text-xs text-wow-text-secondary font-mono">
            {route.pulls.length} {route.pulls.length === 1 ? 'pull' : 'pulls'}
            {' · '}
            {route.totalForces} / {route.dungeon.totalCount} forces
          </div>
        </div>
      )}

      {route && (
        <div className="mb-6">
          <DungeonMap
            dungeon={route.dungeon}
            spawns={route.spawnMarkers}
            selectedPullIndex={selectedPullIndex}
            onSelectPull={setSelectedPullIndex}
          />
        </div>
      )}

      {route && (
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <div className="md:max-h-[calc(100vh-280px)] md:overflow-y-auto pr-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary mb-2">
              Pulls
            </h4>
            {route.pulls.length === 0 ? (
              <p className="text-sm text-wow-text-secondary">This route has no pulls.</p>
            ) : (
              <ul className="space-y-1 list-none p-0 m-0">
                {route.pulls.map((pull) => {
                  const active = pull.index === selectedPullIndex;
                  const pullColor = pull.color ? `#${pull.color}` : undefined;
                  const percent = formatPercent(pull.forces, route.dungeon.totalCount);
                  return (
                    <li key={pull.index}>
                      <button
                        type="button"
                        onClick={() => setSelectedPullIndex(pull.index)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors duration-150 ${
                          active
                            ? 'border-wow-gold-muted bg-wow-bg-elevated text-wow-gold'
                            : 'border-wow-border bg-wow-bg-surface text-wow-text hover:border-wow-gold-muted/60'
                        }`}
                      >
                        {pullColor && (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: pullColor }}
                          />
                        )}
                        <span className="font-semibold text-sm">Pull {pull.index}</span>
                        <span className="ml-auto text-xs text-wow-text-secondary font-mono">
                          {percent}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            {selectedPull ? (
              <PullDetail
                pull={selectedPull}
                totalCount={route.dungeon.totalCount}
                npcsById={npcsById}
              />
            ) : (
              <p className="text-sm text-wow-text-secondary">Select a pull to view its mobs.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PullDetailProps {
  pull: { index: number; forces: number; enemies: MdtPullEnemy[] };
  totalCount: number;
  npcsById: Map<number, ZoneNpc>;
}

function PullDetail({ pull, totalCount, npcsById }: PullDetailProps) {
  if (pull.enemies.length === 0) {
    return (
      <p className="text-sm text-wow-text-secondary">
        Pull {pull.index} has no enemies recorded.
      </p>
    );
  }
  const pullSize = pull.enemies.reduce((sum, e) => sum + e.cloneCount, 0);
  const percent = formatPercent(pull.forces, totalCount);
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary mb-3">
        Pull {pull.index}
        <span className="mx-2 opacity-50">&middot;</span>
        {pullSize} {pullSize === 1 ? 'mob' : 'mobs'}
        <span className="mx-2 opacity-50">&middot;</span>
        {pull.forces} count
        <span className="mx-2 opacity-50">&middot;</span>
        {percent}
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

/** Format a forces count as a percentage of the dungeon's required total. */
function formatPercent(forces: number, totalCount: number): string {
  if (!totalCount) return '—';
  return `${((forces / totalCount) * 100).toFixed(2)}%`;
}
