import { useState, useRef } from 'react';
import { CodeOutlined, DownOutlined } from '@ant-design/icons';
import { ZONE_NPC_OVERRIDES, BLACKLISTED_SPELL_IDS, INSTANCE_BLACKLISTED_SPELL_IDS, IGNORED_NPC_NAMES, INSTANCE_IGNORED_NPC_NAMES, type DevNpcOverride } from '../../data/devData';

const SCHOOL_TAGS: Record<number, { label: string; style: string }> = {
  1: { label: 'Physical', style: 'bg-amber-500/20 text-amber-400' },
  2: { label: 'Holy', style: 'bg-yellow-500/20 text-yellow-300' },
  4: { label: 'Fire', style: 'bg-red-500/20 text-red-400' },
  8: { label: 'Nature', style: 'bg-green-500/20 text-green-400' },
  16: { label: 'Frost', style: 'bg-cyan-500/20 text-cyan-400' },
  32: { label: 'Shadow', style: 'bg-purple-500/20 text-purple-400' },
  64: { label: 'Arcane', style: 'bg-blue-500/20 text-blue-400' },
};

const CLASSIFICATION_LABELS: Record<number, { label: string; style: string }> = {
  1: { label: 'Elite', style: 'bg-orange-500/20 text-orange-400' },
  2: { label: 'Rare Elite', style: 'bg-blue-500/20 text-blue-400' },
  3: { label: 'Boss', style: 'bg-red-500/20 text-red-400' },
  4: { label: 'Rare', style: 'bg-blue-500/20 text-blue-300' },
};

function getSchoolTag(schools: number): { label: string; style: string } | undefined {
  if (SCHOOL_TAGS[schools]) return SCHOOL_TAGS[schools];
  for (const [bit, tag] of Object.entries(SCHOOL_TAGS)) {
    if (schools & Number(bit)) return tag;
  }
  return undefined;
}

function CollapsibleSection({ title, badge, children, defaultOpen = false }: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none cursor-pointer text-left hover:bg-wow-bg-hover/30 transition-colors duration-150 rounded-lg"
      >
        <span
          className="text-wow-text-secondary text-[10px] w-3 shrink-0 inline-flex transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <DownOutlined />
        </span>
        <span className="text-sm font-semibold text-purple-300">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 text-xs rounded-md font-medium bg-purple-500/20 text-purple-300">
            {badge}
          </span>
        )}
      </button>
      <div
        ref={contentRef}
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-3 pb-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function NpcOverrideRow({ npc }: { npc: DevNpcOverride }) {
  const classification = CLASSIFICATION_LABELS[npc.classification];

  return (
    <div className="bg-wow-bg-raised/50 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <a
          href={`https://www.wowhead.com/npc=${npc.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-wow-gold hover:text-wow-gold-bright hover:underline transition-colors"
        >
          {npc.name}
        </a>
        {classification && (
          <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${classification.style}`}>
            {classification.label}
          </span>
        )}
        <span className="text-xs text-wow-text-secondary font-mono">NPC #{npc.id}</span>
      </div>
      {npc.spells && npc.spells.length > 0 ? (
        <div className="ml-4 mt-1.5 space-y-1">
          {npc.spells.map((spell) => {
            const schoolTag = getSchoolTag(spell.schools);
            return (
              <div key={spell.id} className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://www.wowhead.com/spell=${spell.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-wow-text hover:text-wow-gold hover:underline transition-colors"
                >
                  {spell.name}
                </a>
                {schoolTag && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${schoolTag.style}`}>
                    {schoolTag.label}
                  </span>
                )}
                <span className="text-[10px] text-wow-text-secondary font-mono">#{spell.id}</span>
              </div>
            );
          })}
        </div>
      ) : npc.additionalSpells && npc.additionalSpells.length > 0 ? (
        <div className="ml-4 mt-1.5 space-y-1">
          <p className="text-xs text-wow-text-secondary m-0 italic mb-1">
            Fetched from Wowhead + additional spells:
          </p>
          {npc.additionalSpells.map((spell) => {
            const schoolTag = getSchoolTag(spell.schools);
            return (
              <div key={spell.id} className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://www.wowhead.com/spell=${spell.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-wow-gold hover:underline transition-colors"
                >
                  + {spell.name}
                </a>
                {schoolTag && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${schoolTag.style}`}>
                    {schoolTag.label}
                  </span>
                )}
                <span className="text-[10px] text-wow-text-secondary font-mono">#{spell.id}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-wow-text-secondary ml-4 mt-1 m-0 italic">
          No pre-populated spells (fetched from Wowhead)
        </p>
      )}
    </div>
  );
}

interface DevInfoPanelProps {
  instanceId: number;
}

export default function DevInfoPanel({ instanceId }: DevInfoPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const overrides = ZONE_NPC_OVERRIDES[instanceId];
  const instanceBlacklistedSpells = INSTANCE_BLACKLISTED_SPELL_IDS[instanceId];
  const instanceIgnoredNpcs = INSTANCE_IGNORED_NPC_NAMES[instanceId];

  return (
    <div className="mt-8 border-l-4 border-l-purple-500 bg-wow-bg-elevated rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-none cursor-pointer text-left hover:bg-wow-bg-hover/30 transition-colors duration-150"
      >
        <span
          className="text-wow-text-secondary text-[10px] w-3 shrink-0 inline-flex transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <DownOutlined />
        </span>
        <CodeOutlined className="text-purple-400" />
        <span className="text-base font-semibold text-purple-300">Developer Data</span>
        <span className="px-2 py-0.5 text-[10px] rounded font-medium bg-purple-500/20 text-purple-400 uppercase tracking-wider">
          Dev Mode
        </span>
      </button>

      {/* Collapsible body */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-4 pb-4 space-y-2">
            {/* NPC Overrides — Instance-Specific */}
            <CollapsibleSection
              title="NPC Overrides"
              badge={overrides ? `${overrides.length} NPCs` : 'None'}
              defaultOpen={!!overrides}
            >
              {overrides ? (
                <div>
                  {overrides.map((npc) => (
                    <NpcOverrideRow key={npc.id} npc={npc} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-wow-text-secondary m-0 italic">
                  No NPC overrides for this instance
                </p>
              )}
            </CollapsibleSection>

            {/* Blacklisted Spell IDs — Instance-Specific */}
            <CollapsibleSection
              title="Blacklisted Spell IDs"
              badge={instanceBlacklistedSpells ? `${instanceBlacklistedSpells.length} spells` : 'None'}
              defaultOpen={!!instanceBlacklistedSpells}
            >
              {instanceBlacklistedSpells ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {instanceBlacklistedSpells.map((id) => (
                      <a
                        key={id}
                        href={`https://www.wowhead.com/spell=${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-xs font-mono rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-300 transition-colors no-underline border border-red-500/20"
                      >
                        {id}
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-wow-text-secondary mt-2 m-0">
                    These spell IDs are excluded from zone spell results for this instance only.
                  </p>
                </>
              ) : (
                <p className="text-sm text-wow-text-secondary m-0 italic">
                  No instance-specific spell blacklist
                </p>
              )}
            </CollapsibleSection>

            {/* Blacklisted Spell IDs — Global */}
            <CollapsibleSection
              title="Blacklisted Spell IDs"
              badge={`${BLACKLISTED_SPELL_IDS.length} spells \u00B7 Global`}
            >
              <div className="flex flex-wrap gap-2">
                {BLACKLISTED_SPELL_IDS.map((id) => (
                  <a
                    key={id}
                    href={`https://www.wowhead.com/spell=${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-mono rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-300 transition-colors no-underline border border-red-500/20"
                  >
                    {id}
                  </a>
                ))}
              </div>
              <p className="text-xs text-wow-text-secondary mt-2 m-0">
                These spell IDs are excluded from all zone spell results across every instance.
              </p>
            </CollapsibleSection>

            {/* Ignored NPC Names — Instance-Specific */}
            <CollapsibleSection
              title="Ignored NPC Names"
              badge={instanceIgnoredNpcs ? `${instanceIgnoredNpcs.length} NPCs` : 'None'}
              defaultOpen={!!instanceIgnoredNpcs}
            >
              {instanceIgnoredNpcs ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {instanceIgnoredNpcs.map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 text-xs rounded-md bg-wow-bg-raised text-wow-text-secondary border border-wow-border"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-wow-text-secondary mt-2 m-0">
                    These NPC names are filtered out of zone data for this instance only.
                  </p>
                </>
              ) : (
                <p className="text-sm text-wow-text-secondary m-0 italic">
                  No instance-specific ignored NPCs
                </p>
              )}
            </CollapsibleSection>

            {/* Ignored NPC Names — Global */}
            <CollapsibleSection
              title="Ignored NPC Names"
              badge={`${IGNORED_NPC_NAMES.length} NPCs \u00B7 Global`}
            >
              <div className="flex flex-wrap gap-1.5">
                {IGNORED_NPC_NAMES.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 text-xs rounded-md bg-wow-bg-raised text-wow-text-secondary border border-wow-border"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-wow-text-secondary mt-2 m-0">
                These NPC names are filtered out of zone data for all instances (warlock pets, friendly NPCs, replaced mobs, etc.).
              </p>
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
}
