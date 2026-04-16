import { useMemo, useState } from 'react';
import { Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { decodeMdtString } from '../../lib/mdt/decodeRoute';
import { parseMdtRoute } from '../../lib/mdt/parseRoute';
import { instanceBySlug } from '../../data';
import type { SavedMdtRoute } from '../../hooks/useSavedMdtRoutes';

interface SavedRouteCardProps {
  saved: SavedMdtRoute;
  isCurrent: boolean;
  onLoad: (saved: SavedMdtRoute) => void;
  onRemove: (id: string) => void;
}

interface RouteMeta {
  pullCount: number;
  forces: number;
  totalCount: number;
  percent: number;
  instanceSlug: string;
}

/** A single saved-route card for the landing view. Decodes the MDT string
 *  on the fly to surface the dungeon image, pull count, and forces % so
 *  users can compare routes without opening them. Decoding errors fall
 *  through silently — the card still renders with just name + dungeon. */
export default function SavedRouteCard({
  saved,
  isCurrent,
  onLoad,
  onRemove,
}: SavedRouteCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const meta = useMemo<RouteMeta | null>(() => {
    try {
      const raw = decodeMdtString(saved.mdtString);
      const parsed = parseMdtRoute(raw);
      const totalCount = parsed.dungeon.totalCount;
      const percent = totalCount > 0
        ? Math.min(100, (parsed.totalForces / totalCount) * 100)
        : 0;
      return {
        pullCount: parsed.pulls.length,
        forces: parsed.totalForces,
        totalCount,
        percent,
        instanceSlug: parsed.dungeon.instanceSlug,
      };
    } catch {
      return null;
    }
  // The decoded shape is fully derived from the saved id (mdtString is
  // immutable per save). Memoize on id to avoid re-decoding on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.id]);

  const instance = meta ? instanceBySlug.get(meta.instanceSlug) : undefined;
  const backgroundImage = instance?.backgroundImage;
  const hasImage = !!backgroundImage;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
        isCurrent
          ? 'border-wow-gold-muted ring-2 ring-wow-gold-muted/40'
          : 'border-wow-border hover:border-wow-gold-muted'
      }`}
      style={{
        boxShadow: 'var(--wow-card-shadow)',
        aspectRatio: hasImage ? '16 / 9' : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => onLoad(saved)}
        className="block w-full h-full text-left cursor-pointer p-0 m-0 border-0 bg-transparent"
      >
        {hasImage && (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-wow-bg-raised animate-pulse" />
            )}
            <img
              src={backgroundImage}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          </>
        )}

        <div
          className={`relative ${
            hasImage
              ? 'flex flex-col justify-end h-full p-3'
              : 'bg-wow-bg-surface px-3 py-2.5'
          }`}
        >
          <div
            className={`font-semibold text-sm truncate ${
              hasImage ? 'text-white' : 'text-wow-gold'
            }`}
          >
            {saved.name}
          </div>
          <div
            className={`text-xs truncate ${
              hasImage ? 'text-zinc-300' : 'text-wow-text-secondary'
            }`}
          >
            {saved.dungeonName}
          </div>
          {meta && (
            <div
              className={`mt-1.5 flex items-center gap-2 text-[11px] font-mono ${
                hasImage ? 'text-zinc-300' : 'text-wow-text-dim'
              }`}
            >
              <span className="shrink-0">
                {meta.pullCount} {meta.pullCount === 1 ? 'pull' : 'pulls'}
              </span>
              <span
                className={`w-14 h-1 rounded-full overflow-hidden shrink-0 ${
                  hasImage ? 'bg-white/20' : 'bg-wow-bg-raised'
                }`}
                aria-hidden
              >
                <span
                  className="block h-full bg-wow-gold"
                  style={{ width: `${meta.percent}%` }}
                />
              </span>
              <span className="shrink-0">{meta.percent.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </button>
      <Popconfirm
        title="Delete this saved route?"
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        onConfirm={() => onRemove(saved.id)}
      >
        <button
          type="button"
          aria-label={`Delete ${saved.name}`}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center text-white/85 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:text-red-300 hover:bg-red-500/40 focus:opacity-100 transition-opacity"
        >
          <DeleteOutlined />
        </button>
      </Popconfirm>
    </div>
  );
}
