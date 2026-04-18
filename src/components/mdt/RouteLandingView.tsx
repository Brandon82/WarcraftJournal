import { useMemo, useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined, ImportOutlined } from '@ant-design/icons';
import SavedRouteCard from './SavedRouteCard';
import FeaturedRouteCard from './FeaturedRouteCard';
import type { SavedMdtRoute } from '../../hooks/useSavedMdtRoutes';
import { instanceBySlug, type RaiderIORoute } from '../../data';

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
}: RouteLandingViewProps) {
  // `null` = show every run. Otherwise filter to the selected dungeon.
  const [dungeonFilter, setDungeonFilter] = useState<string | null>(null);

  // One entry per unique dungeon, in raider.io rank order (the first
  // occurrence of each slug in featuredRoutes is its top-ranked run —
  // which is the display we want for the filter chip thumbnail).
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
    return chips;
  }, [featuredRoutes]);

  const visibleFeaturedRoutes = useMemo(() => {
    if (!dungeonFilter) return featuredRoutes;
    return featuredRoutes.filter((r) => r.instanceSlug === dungeonFilter);
  }, [featuredRoutes, dungeonFilter]);

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
            {visibleFeaturedRoutes.map(({ instanceSlug, route }) => (
              <FeaturedRouteCard
                key={`${instanceSlug}:${route.source.keystoneRunId}`}
                instanceSlug={instanceSlug}
                route={route}
                isCurrent={currentMdtString === route.mdtString}
                onLoad={onLoadFeatured}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary m-0">
            Saved routes
          </h4>
          {savedRoutes.length > 0 && (
            <span className="text-xs text-wow-text-dim font-mono">
              {savedRoutes.length} saved
            </span>
          )}
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
        ) : (
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {savedRoutes.map((saved) => (
              <SavedRouteCard
                key={saved.id}
                saved={saved}
                isCurrent={currentMdtString === saved.mdtString}
                onLoad={onLoadSaved}
                onRemove={onRemoveSaved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
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
