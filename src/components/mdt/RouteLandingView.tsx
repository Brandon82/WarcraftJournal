import { useEffect, useMemo, useState } from 'react';
import { Button, Pagination, Popconfirm } from 'antd';
import { PlusOutlined, ImportOutlined, DeleteOutlined } from '@ant-design/icons';
import SavedRouteCard from './SavedRouteCard';
import FeaturedRouteCard from './FeaturedRouteCard';
import type { SavedMdtRoute } from '../../hooks/useSavedMdtRoutes';
import { instanceBySlug, type RaiderIORoute } from '../../data';
import { decodeMdtString } from '../../lib/mdt/decodeRoute';
import { parseMdtRoute } from '../../lib/mdt/parseRoute';

interface FeaturedRoute {
  instanceSlug: string;
  route: RaiderIORoute;
}

interface RouteLandingViewProps {
  savedRoutes: SavedMdtRoute[];
  featuredRoutes: FeaturedRoute[];
  /** mdtString of the currently-loaded route, used to highlight its card.
   *  In the landing view this is usually null, but kept for symmetry. */
  currentMdtString: string | null;
  onCreate: () => void;
  onImport: () => void;
  onLoadSaved: (saved: SavedMdtRoute) => void;
  onLoadFeatured: (route: RaiderIORoute) => void;
  onRemoveSaved: (id: string) => void;
  onClearAllSaved: () => void;
}

/** Shown when no route is loaded. The CTAs (`Create new route`, `Import`)
 *  are the headline action; saved routes fill the rest of the page so the
 *  user lands on their library, not on an empty textarea. */
export default function RouteLandingView({
  savedRoutes,
  featuredRoutes,
  currentMdtString,
  onCreate,
  onImport,
  onLoadSaved,
  onLoadFeatured,
  onRemoveSaved,
  onClearAllSaved,
}: RouteLandingViewProps) {
  // `null` = show every run. Otherwise filter to the selected dungeon.
  const [dungeonFilter, setDungeonFilter] = useState<string | null>(null);

  // Decode each saved route once to recover its instance slug — the saved
  // payload only carries the raw MDT string + display name, but filtering
  // needs a stable slug. Memoize on id so we don't re-decode on every render.
  const savedInstanceSlugs = useMemo(() => {
    const m = new Map<string, string>();
    for (const saved of savedRoutes) {
      try {
        const parsed = parseMdtRoute(decodeMdtString(saved.mdtString));
        m.set(saved.id, parsed.dungeon.instanceSlug);
      } catch {
        // Decode failure leaves the route un-filterable; it'll show only
        // when "All" is active.
      }
    }
    return m;
  }, [savedRoutes]);

  // Chips include any dungeon with a featured run OR a saved route, so the
  // filter can narrow saved routes even when no featured run exists for that
  // dungeon. Featured-route order wins (raider.io rank); saved-only dungeons
  // are appended in the order they appear in the saved list.
  const dungeonChips = useMemo(() => {
    const seen = new Set<string>();
    const chips: { slug: string; name: string; backgroundImage?: string }[] = [];
    for (const { instanceSlug, route } of featuredRoutes) {
      if (seen.has(instanceSlug)) continue;
      seen.add(instanceSlug);
      const instance = instanceBySlug.get(instanceSlug);
      chips.push({
        slug: instanceSlug,
        name: instance?.name ?? route.source.dungeonName,
        backgroundImage: instance?.backgroundImage,
      });
    }
    for (const saved of savedRoutes) {
      const slug = savedInstanceSlugs.get(saved.id);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const instance = instanceBySlug.get(slug);
      chips.push({
        slug,
        name: instance?.name ?? saved.dungeonName,
        backgroundImage: instance?.backgroundImage,
      });
    }
    return chips;
  }, [featuredRoutes, savedRoutes, savedInstanceSlugs]);

  const visibleFeaturedRoutes = useMemo(() => {
    if (!dungeonFilter) return featuredRoutes;
    return featuredRoutes.filter((r) => r.instanceSlug === dungeonFilter);
  }, [featuredRoutes, dungeonFilter]);

  const visibleSavedRoutes = useMemo(() => {
    if (!dungeonFilter) return savedRoutes;
    return savedRoutes.filter(
      (saved) => savedInstanceSlugs.get(saved.id) === dungeonFilter,
    );
  }, [savedRoutes, savedInstanceSlugs, dungeonFilter]);

  // Cap each grid at 3 rows of cards. Page size scales with the responsive
  // column count so we always render exactly N rows on every breakpoint.
  const colsPerRow = useColsPerRow();
  const pageSize = colsPerRow * 3;

  const [featuredPage, setFeaturedPage] = useState(1);
  const [savedPage, setSavedPage] = useState(1);

  // Filter swap or page-size shrink can leave the active page empty; reset
  // back to 1 so the user always sees content.
  useEffect(() => {
    setFeaturedPage(1);
    setSavedPage(1);
  }, [dungeonFilter, pageSize]);

  const featuredTotalPages = Math.max(
    1,
    Math.ceil(visibleFeaturedRoutes.length / pageSize),
  );
  const savedTotalPages = Math.max(
    1,
    Math.ceil(visibleSavedRoutes.length / pageSize),
  );

  // Removing the last route on a page would otherwise leave us paginated
  // off the end; clamp back to the new last page.
  useEffect(() => {
    if (featuredPage > featuredTotalPages) setFeaturedPage(featuredTotalPages);
  }, [featuredTotalPages, featuredPage]);
  useEffect(() => {
    if (savedPage > savedTotalPages) setSavedPage(savedTotalPages);
  }, [savedTotalPages, savedPage]);

  const pagedFeaturedRoutes = useMemo(
    () =>
      visibleFeaturedRoutes.slice(
        (featuredPage - 1) * pageSize,
        featuredPage * pageSize,
      ),
    [visibleFeaturedRoutes, featuredPage, pageSize],
  );
  const pagedSavedRoutes = useMemo(
    () =>
      visibleSavedRoutes.slice(
        (savedPage - 1) * pageSize,
        savedPage * pageSize,
      ),
    [visibleSavedRoutes, savedPage, pageSize],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreate}
        >
          Create new route
        </Button>
        <Button
          icon={<ImportOutlined />}
          onClick={onImport}
        >
          Import from MDT
        </Button>
      </div>

      {featuredRoutes.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary m-0">
              Top raider.io routes
              {dungeonFilter && (
                <>
                  {' '}
                  <span className="text-wow-gold-muted normal-case tracking-normal">
                    · {instanceBySlug.get(dungeonFilter)?.name ?? ''}
                  </span>
                </>
              )}
            </h4>
            <span className="text-xs text-wow-text-dim font-mono">
              {visibleFeaturedRoutes.length}{' '}
              {visibleFeaturedRoutes.length === 1 ? 'run' : 'runs'}
            </span>
          </div>

          <DungeonFilterBar
            chips={dungeonChips}
            active={dungeonFilter}
            onChange={setDungeonFilter}
          />

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {pagedFeaturedRoutes.map(({ instanceSlug, route }) => (
              <FeaturedRouteCard
                key={`${instanceSlug}:${route.source.keystoneRunId}`}
                instanceSlug={instanceSlug}
                route={route}
                isCurrent={currentMdtString === route.mdtString}
                onLoad={onLoadFeatured}
              />
            ))}
            {/* Pad short pages so the grid stays exactly 3 rows tall and the
             *  pagination control underneath it doesn't jump vertically when
             *  the user lands on the last (partially-filled) page. Only pads
             *  when pagination is actually active. */}
            {visibleFeaturedRoutes.length > pageSize &&
              Array.from({ length: pageSize - pagedFeaturedRoutes.length }).map(
                (_, i) => <GridFiller key={`featured-filler-${i}`} />,
              )}
          </div>
          {visibleFeaturedRoutes.length > pageSize && (
            <div className="flex justify-center mt-3">
              <Pagination
                size="small"
                current={featuredPage}
                pageSize={pageSize}
                total={visibleFeaturedRoutes.length}
                onChange={setFeaturedPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      )}

      {/* When there are no featured routes the chip bar didn't render above,
       *  but saved routes still need a way to be filtered, so render it here
       *  on its own. */}
      {featuredRoutes.length === 0 && dungeonChips.length > 0 && (
        <DungeonFilterBar
          chips={dungeonChips}
          active={dungeonFilter}
          onChange={setDungeonFilter}
        />
      )}

      <div>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary m-0">
            Saved routes
            {dungeonFilter && (
              <>
                {' '}
                <span className="text-wow-gold-muted normal-case tracking-normal">
                  · {instanceBySlug.get(dungeonFilter)?.name ?? ''}
                </span>
              </>
            )}
          </h4>
          <div className="flex items-center gap-2">
            {savedRoutes.length > 0 && (
              <span className="text-xs text-wow-text-dim font-mono">
                {dungeonFilter
                  ? `${visibleSavedRoutes.length} / ${savedRoutes.length} saved`
                  : `${savedRoutes.length} saved`}
              </span>
            )}
            {savedRoutes.length > 0 && (
              <Popconfirm
                title="Delete all saved routes?"
                description="This permanently removes every saved route from this browser."
                okText="Delete all"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={onClearAllSaved}
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  Delete all
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>

        {savedRoutes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-wow-border bg-wow-bg-surface/60 px-4 py-8 text-center">
            <p className="text-sm text-wow-text-secondary m-0">
              No saved routes yet.
            </p>
            <p className="text-xs text-wow-text-dim mt-1 mb-0">
              Create a fresh route or import one from MDT to get started.
            </p>
          </div>
        ) : visibleSavedRoutes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-wow-border bg-wow-bg-surface/60 px-4 py-8 text-center">
            <p className="text-sm text-wow-text-secondary m-0">
              No saved routes for{' '}
              <span className="text-wow-gold-muted">
                {instanceBySlug.get(dungeonFilter ?? '')?.name ?? 'this dungeon'}
              </span>
              .
            </p>
            <p className="text-xs text-wow-text-dim mt-1 mb-0">
              Clear the dungeon filter to see your other saved routes.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {pagedSavedRoutes.map((saved) => (
                <SavedRouteCard
                  key={saved.id}
                  saved={saved}
                  isCurrent={currentMdtString === saved.mdtString}
                  onLoad={onLoadSaved}
                  onRemove={onRemoveSaved}
                />
              ))}
              {visibleSavedRoutes.length > pageSize &&
                Array.from({ length: pageSize - pagedSavedRoutes.length }).map(
                  (_, i) => <GridFiller key={`saved-filler-${i}`} />,
                )}
            </div>
            {visibleSavedRoutes.length > pageSize && (
              <div className="flex justify-center mt-3">
                <Pagination
                  size="small"
                  current={savedPage}
                  pageSize={pageSize}
                  total={visibleSavedRoutes.length}
                  onChange={setSavedPage}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Empty grid cell that mirrors the real card's aspect ratio so a partially
 *  filled last page still occupies the full 3-row footprint, keeping the
 *  pagination control vertically anchored. */
function GridFiller() {
  return <div aria-hidden className="invisible" style={{ aspectRatio: '16 / 9' }} />;
}

/** Tracks how many cards-per-row the responsive grid is currently rendering.
 *  Mirrors the Tailwind breakpoints baked into the grid class
 *  (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) so we can compute a page
 *  size that produces exactly N rows. */
function useColsPerRow(): number {
  const [cols, setCols] = useState<number>(() => {
    if (typeof window === 'undefined') return 5;
    if (window.matchMedia('(min-width: 1024px)').matches) return 5;
    if (window.matchMedia('(min-width: 640px)').matches) return 3;
    return 2;
  });
  useEffect(() => {
    const mqlLg = window.matchMedia('(min-width: 1024px)');
    const mqlSm = window.matchMedia('(min-width: 640px)');
    const update = () => {
      if (mqlLg.matches) setCols(5);
      else if (mqlSm.matches) setCols(3);
      else setCols(2);
    };
    mqlLg.addEventListener('change', update);
    mqlSm.addEventListener('change', update);
    return () => {
      mqlLg.removeEventListener('change', update);
      mqlSm.removeEventListener('change', update);
    };
  }, []);
  return cols;
}

interface DungeonChip {
  slug: string;
  name: string;
  backgroundImage?: string;
}

interface DungeonFilterBarProps {
  chips: DungeonChip[];
  active: string | null;
  onChange: (slug: string | null) => void;
}

/** Horizontal row of dungeon thumbnails acting as filter chips. Click a
 *  thumbnail to narrow the grid to just that dungeon; click the active one
 *  again (or "All") to clear. More scannable than a dropdown because every
 *  option is visible at once with its artwork. */
function DungeonFilterBar({ chips, active, onChange }: DungeonFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`px-3 h-12 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
          active === null
            ? 'border-wow-gold-muted bg-wow-bg-raised text-wow-gold ring-2 ring-wow-gold-muted/40'
            : 'border-wow-border bg-wow-bg-surface text-wow-text-secondary hover:border-wow-gold-muted hover:text-wow-gold'
        }`}
      >
        All
      </button>
      {chips.map((chip) => {
        const isActive = active === chip.slug;
        return (
          <button
            key={chip.slug}
            type="button"
            onClick={() => onChange(isActive ? null : chip.slug)}
            title={chip.name}
            aria-pressed={isActive}
            className={`group relative h-12 w-28 shrink-0 overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer ${
              isActive
                ? 'border-wow-gold-muted ring-2 ring-wow-gold-muted/60 scale-[1.02]'
                : 'border-wow-border hover:border-wow-gold-muted opacity-80 hover:opacity-100'
            }`}
          >
            {chip.backgroundImage && (
              <img
                src={chip.backgroundImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div
              className={`absolute inset-0 transition-colors ${
                isActive
                  ? 'bg-gradient-to-t from-black/85 via-black/45 to-black/20'
                  : 'bg-gradient-to-t from-black/90 via-black/55 to-black/30 group-hover:from-black/80 group-hover:via-black/40'
              }`}
            />
            <span
              className={`absolute inset-0 flex items-end px-2 pb-1 text-[10px] font-semibold leading-tight text-left ${
                isActive ? 'text-wow-gold' : 'text-white'
              }`}
            >
              {chip.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
