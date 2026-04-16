import { useState } from 'react';
import { Button } from 'antd';
import { MDT_DUNGEONS } from '../../lib/mdt/dungeons';
import { instanceBySlug } from '../../data';
import type { MdtDungeonTable } from '../../lib/mdt/types';

interface DungeonPickerProps {
  onPick: (dungeon: MdtDungeonTable) => void;
  onCancel: () => void;
}

/** Grid of the current season's MDT dungeons — picking one starts a fresh
 *  route builder using that dungeon's pre-bundled enemy/spawn table.
 *  Tiles use the journal's instance background images so the picker
 *  matches the visual language of the rest of the app. */
export default function DungeonPicker({ onPick, onCancel }: DungeonPickerProps) {
  return (
    <div className="mb-6 mdt-picker-enter rounded-xl border border-wow-border bg-wow-bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-wow-gold m-0">Pick a dungeon</h4>
        <Button size="small" onClick={onCancel}>Cancel</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MDT_DUNGEONS.map((dungeon) => (
          <DungeonPickerTile
            key={dungeon.instanceSlug}
            dungeon={dungeon}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}

interface TileProps {
  dungeon: MdtDungeonTable;
  onPick: (dungeon: MdtDungeonTable) => void;
}

function DungeonPickerTile({ dungeon, onPick }: TileProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const instance = instanceBySlug.get(dungeon.instanceSlug);
  const backgroundImage = instance?.backgroundImage;
  const hasImage = !!backgroundImage;

  return (
    <button
      type="button"
      onClick={() => onPick(dungeon)}
      className="group relative overflow-hidden rounded-xl border border-wow-border hover:border-wow-gold-muted transition-all duration-300 cursor-pointer p-0 m-0 text-left bg-transparent"
      style={{
        boxShadow: 'var(--wow-card-shadow)',
        aspectRatio: hasImage ? '16 / 9' : undefined,
      }}
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
            : 'bg-wow-bg-elevated px-3 py-2.5'
        }`}
      >
        <div
          className={`font-semibold text-sm truncate ${
            hasImage ? 'text-white' : 'text-wow-gold'
          }`}
        >
          {dungeon.displayName}
        </div>
        <div
          className={`text-xs truncate ${
            hasImage ? 'text-zinc-300' : 'text-wow-text-secondary'
          }`}
        >
          {dungeon.enemies.length} enemies &middot; {dungeon.totalCount} forces
        </div>
      </div>
    </button>
  );
}
