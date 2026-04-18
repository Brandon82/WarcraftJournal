import { Button } from 'antd';
import { PlusOutlined, ImportOutlined } from '@ant-design/icons';
import SavedRouteCard from './SavedRouteCard';
import FeaturedRouteCard from './FeaturedRouteCard';
import type { SavedMdtRoute } from '../../hooks/useSavedMdtRoutes';
import type { RaiderIORoute } from '../../data';

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
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary m-0">
              Top raider.io routes
            </h4>
            <span className="text-xs text-wow-text-dim font-mono">
              {featuredRoutes.length} dungeons
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRoutes.map(({ instanceSlug, route }) => (
              <FeaturedRouteCard
                key={instanceSlug}
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
