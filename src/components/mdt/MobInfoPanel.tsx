import { useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import type { MdtDungeonEnemy, MdtSpawnMarker } from '../../lib/mdt/types';
import { NpcGroup } from '../zone-spells/ZoneSpellSection';
import type { ZoneNpc } from '../../types';

interface Props {
  spawn: MdtSpawnMarker;
  enemy: MdtDungeonEnemy | undefined;
  npcsById: Map<number, ZoneNpc>;
  onClose: () => void;
}

/** Detail panel rendered when the user shift-clicks a mob on the map.
 *  Reuses NpcGroup for the abilities table so styling stays consistent
 *  with the per-pull detail view. */
export default function MobInfoPanel({ spawn, enemy, npcsById, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const existing = npcsById.get(spawn.npcId);
  const npc: ZoneNpc = existing ?? {
    id: spawn.npcId,
    name: spawn.name,
    classification: spawn.isBoss ? 3 : 1,
    spells: [],
  };
  const creatureType = typeof enemy?.creatureType === 'string' ? enemy.creatureType : null;
  const perMobForces = typeof enemy?.count === 'number' ? enemy.count : null;
  const health = typeof enemy?.health === 'number' ? enemy.health : null;

  return (
    <div className="mdt-mob-info-panel">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h4 className="text-sm font-semibold text-wow-gold m-0">
            {spawn.name}
          </h4>
          <div className="text-xs text-wow-text-secondary mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {creatureType && <span>{creatureType}</span>}
            {perMobForces != null && <span>{perMobForces} forces</span>}
            {health != null && <span>{formatHealth(health)} HP</span>}
            {spawn.pullIndex != null && (
              <span style={{ color: spawn.pullColor ? `#${spawn.pullColor}` : undefined }}>
                Pull {spawn.pullIndex}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close mob info"
          onClick={onClose}
          className="mdt-mob-info-panel-close"
        >
          <CloseOutlined />
        </button>
      </div>

      <NpcGroup
        npc={npc}
        isBoss={spawn.isBoss}
        fallbackNote={
          existing
            ? undefined
            : 'No abilities recorded for this NPC in WarcraftJournal.'
        }
      />
    </div>
  );
}

function formatHealth(h: number): string {
  if (h >= 1_000_000) return `${(h / 1_000_000).toFixed(1)}M`;
  if (h >= 1000) return `${(h / 1000).toFixed(0)}K`;
  return String(h);
}
