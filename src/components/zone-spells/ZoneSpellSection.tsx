import { useState, useRef } from 'react';
import { DownOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ZoneNpc, ZoneSpell } from '../../types';

const SCHOOL_TAGS: Record<number, { label: string; style: string }> = {
  1: { label: 'Physical', style: 'bg-amber-500/20 text-amber-400' },
  2: { label: 'Holy', style: 'bg-yellow-500/20 text-yellow-300' },
  4: { label: 'Fire', style: 'bg-red-500/20 text-red-400' },
  8: { label: 'Nature', style: 'bg-green-500/20 text-green-400' },
  16: { label: 'Frost', style: 'bg-cyan-500/20 text-cyan-400' },
  32: { label: 'Shadow', style: 'bg-purple-500/20 text-purple-400' },
  64: { label: 'Arcane', style: 'bg-blue-500/20 text-blue-400' },
};

function getSchoolTag(schools: number): { label: string; style: string } | undefined {
  // Check for exact single-school match first
  if (SCHOOL_TAGS[schools]) return SCHOOL_TAGS[schools];
  // Multi-school: find the first matching bit
  for (const [bit, tag] of Object.entries(SCHOOL_TAGS)) {
    if (schools & Number(bit)) return tag;
  }
  return undefined;
}

const CLASSIFICATION_LABELS: Record<number, { label: string; style: string }> = {
  1: { label: 'Elite', style: 'bg-orange-500/20 text-orange-400' },
  2: { label: 'Rare Elite', style: 'bg-blue-500/20 text-blue-400' },
  3: { label: 'Boss', style: 'bg-red-500/20 text-red-400' },
};

function SpellRow({ spell }: { spell: ZoneSpell }) {
  const schoolTag = getSchoolTag(spell.schools);

  return (
    <div className="flex items-start gap-3 px-4 py-2">
      {spell.spellIcon ? (
        <img
          src={spell.spellIcon}
          alt={spell.name}
          className="w-8 h-8 rounded-lg object-cover border border-wow-border shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-wow-bg-raised text-wow-gold-muted flex items-center justify-center shrink-0 mt-0.5">
          <ThunderboltOutlined className="text-xs" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-wow-gold">{spell.name}</span>
          {schoolTag && (
            <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${schoolTag.style}`}>
              {schoolTag.label}
            </span>
          )}
        </div>
        {spell.description && (
          <p className="text-wow-text-secondary text-[13px] leading-relaxed m-0 mt-0.5">
            {spell.description}
          </p>
        )}
      </div>
    </div>
  );
}

function NpcGroup({ npc, isBoss }: { npc: ZoneNpc; isBoss: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const classification = isBoss
    ? CLASSIFICATION_LABELS[3]
    : CLASSIFICATION_LABELS[npc.classification];

  return (
    <div className="bg-wow-bg-elevated border border-wow-border rounded-xl mb-2">
      <div
        onClick={() => setExpanded(!expanded)}
        className="px-4 py-3 select-none flex items-center gap-3 cursor-pointer hover:bg-wow-bg-hover/30 transition-colors duration-150 rounded-t-xl"
      >
        <span
          className="text-wow-text-secondary text-[10px] w-3 shrink-0 inline-flex transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <DownOutlined />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold text-wow-text">{npc.name}</span>
            {classification && (
              <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${classification.style}`}>
                {classification.label}
              </span>
            )}
            <span className="text-xs text-wow-text-secondary">
              {npc.spells.length} {npc.spells.length === 1 ? 'ability' : 'abilities'}
            </span>
          </div>
        </div>
      </div>

      <div
        ref={contentRef}
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pb-2">
            {npc.spells.map((spell) => (
              <SpellRow key={spell.id} spell={spell} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ZoneSpellSectionProps {
  npcs: ZoneNpc[];
  bossNames: Set<string>;
}

export default function ZoneSpellSection({ npcs, bossNames }: ZoneSpellSectionProps) {
  const sortedNpcs = [...npcs].sort((a, b) => {
    // Priority: boss (0) > elite/rare-elite (1) > other (2)
    const tierA = bossNames.has(a.name) ? 0 : a.classification >= 1 ? 1 : 2;
    const tierB = bossNames.has(b.name) ? 0 : b.classification >= 1 ? 1 : 2;
    if (tierA !== tierB) return tierA - tierB;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold text-wow-gold mb-4 tracking-wide">
        Dungeon Abilities
      </h3>
      <div>
        {sortedNpcs.map((npc) => (
          <NpcGroup key={npc.id} npc={npc} isBoss={bossNames.has(npc.name)} />
        ))}
      </div>
    </div>
  );
}
