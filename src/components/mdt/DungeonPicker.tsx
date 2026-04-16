import { Button } from 'antd';
import { MDT_DUNGEONS } from '../../lib/mdt/dungeons';
import type { MdtDungeonTable } from '../../lib/mdt/types';

interface DungeonPickerProps {
  onPick: (dungeon: MdtDungeonTable) => void;
  onCancel: () => void;
}

/** Grid of the current season's MDT dungeons — picking one starts a fresh
 *  route builder using that dungeon's pre-bundled enemy/spawn table. */
export default function DungeonPicker({ onPick, onCancel }: DungeonPickerProps) {
  return (
    <div className="mb-6 rounded-xl border border-wow-border bg-wow-bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-wow-gold m-0">Pick a dungeon</h4>
        <Button size="small" onClick={onCancel}>Cancel</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MDT_DUNGEONS.map((dungeon) => (
          <button
            key={dungeon.instanceSlug}
            type="button"
            onClick={() => onPick(dungeon)}
            className="text-left rounded-lg border border-wow-border bg-wow-bg-elevated px-3 py-2 hover:border-wow-gold-muted/60 transition-colors duration-150"
          >
            <div className="font-semibold text-sm text-wow-gold truncate">
              {dungeon.displayName}
            </div>
            <div className="text-xs text-wow-text-secondary truncate">
              {dungeon.enemies.length} enemies &middot; {dungeon.totalCount} forces
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
