import { useMemo } from 'react';
import { Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { decodeMdtString } from '../../lib/mdt/decodeRoute';
import { parseMdtRoute } from '../../lib/mdt/parseRoute';
import type { SavedMdtRoute } from '../../hooks/useSavedMdtRoutes';

interface SavedRouteCardProps {
  saved: SavedMdtRoute;
  isCurrent: boolean;
  onLoad: (saved: SavedMdtRoute) => void;
  onRemove: (id: string) => void;
}

interface RouteStats {
  pullCount: number;
  forces: number;
  totalCount: number;
  percent: number;
}

/** A single saved-route card for the landing view. Decodes the MDT string
 *  on the fly to surface pull count + forces % so users can compare routes
 *  without opening them. Decoding errors fall through silently — the card
 *  still renders with just name + dungeon. */
export default function SavedRouteCard({
  saved,
  isCurrent,
  onLoad,
  onRemove,
}: SavedRouteCardProps) {
  const stats = useMemo<RouteStats | null>(() => {
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
      };
    } catch {
      return null;
    }
  // The decoded shape is fully derived from the saved id (mdtString is
  // immutable per save). Memoize on id to avoid re-decoding on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.id]);

  return (
    <div
      className={`relative rounded-lg border px-3 py-2.5 transition-colors duration-150 ${
        isCurrent
          ? 'border-wow-gold-muted bg-wow-bg-elevated'
          : 'border-wow-border bg-wow-bg-surface hover:border-wow-gold-muted/60'
      }`}
    >
      <button
        type="button"
        onClick={() => onLoad(saved)}
        className="block w-full text-left pr-7"
      >
        <div className="font-semibold text-sm text-wow-gold truncate">
          {saved.name}
        </div>
        <div className="text-xs text-wow-text-secondary truncate">
          {saved.dungeonName}
        </div>
        {stats && (
          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono text-wow-text-dim">
            <span className="shrink-0">
              {stats.pullCount} {stats.pullCount === 1 ? 'pull' : 'pulls'}
            </span>
            <span
              className="w-14 h-1 rounded-full bg-wow-bg-raised overflow-hidden shrink-0"
              aria-hidden
            >
              <span
                className="block h-full bg-wow-gold"
                style={{ width: `${stats.percent}%` }}
              />
            </span>
            <span className="shrink-0">{stats.percent.toFixed(1)}%</span>
          </div>
        )}
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
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-wow-text-dim opacity-60 hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 focus:opacity-100 transition-opacity"
        >
          <DeleteOutlined />
        </button>
      </Popconfirm>
    </div>
  );
}
