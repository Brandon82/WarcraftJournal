import { Button, Input } from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CheckOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { ParsedMdtRoute } from '../../lib/mdt/types';

interface RouteEditorHeaderProps {
  route: ParsedMdtRoute;
  isSaved: boolean;
  onSave: () => void;
  onExport: () => void;
  onClose: () => void;
  onRename: (title: string) => void;
}

/** Sticky toolbar shown above the map in editing mode. Surfaces the route
 *  name (renameable in place), dungeon, save/back actions, and a slim
 *  forces-progress bar that's the user's at-a-glance "how far along is
 *  this route" indicator. */
export default function RouteEditorHeader({
  route,
  isSaved,
  onSave,
  onExport,
  onClose,
  onRename,
}: RouteEditorHeaderProps) {
  const totalCount = route.dungeon.totalCount;
  const percent = totalCount > 0
    ? Math.min(100, (route.totalForces / totalCount) * 100)
    : 0;

  return (
    <div
      // Rounded card matching the app's main header styling. Scrolls with
      // the rest of the page rather than sticking — the small per-pull
      // controls and forces summary stay grouped with the route content
      // they describe.
      className="mb-3 rounded-2xl border border-wow-border bg-wow-bg-surface px-4 sm:px-6 py-3"
      style={{ boxShadow: '0 2px 16px 0 rgb(0 0 0 / 0.15)' }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={onClose}
        >
          Back
        </Button>
        <Input
          value={route.title}
          onChange={(e) => onRename(e.target.value)}
          className="max-w-xs"
          size="small"
          placeholder="Route name"
        />
        <span className="text-wow-text-secondary text-sm truncate">
          {route.dungeon.displayName}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="small"
            onClick={onExport}
            icon={<ExportOutlined />}
          >
            Export
          </Button>
          <Button
            size="small"
            type={isSaved ? 'default' : 'primary'}
            onClick={onSave}
            disabled={isSaved}
            icon={isSaved ? <CheckOutlined /> : <SaveOutlined />}
          >
            {isSaved ? 'Saved' : 'Save route'}
          </Button>
        </div>
      </div>

      <div className="mt-2">
        <div
          className="h-1.5 w-full rounded-full bg-wow-bg-raised overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div
            className="h-full bg-wow-gold transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-mono text-wow-text-secondary">
          <span className="text-wow-gold">
            {percent.toFixed(2)}%
          </span>
          <span>
            {route.totalForces} / {totalCount} forces
          </span>
          <span className="opacity-60">·</span>
          <span>
            {route.pulls.length} {route.pulls.length === 1 ? 'pull' : 'pulls'}
          </span>
        </div>
      </div>
    </div>
  );
}
