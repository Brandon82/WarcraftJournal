import { useState, useRef } from 'react';
import { ThunderboltOutlined, DownOutlined } from '@ant-design/icons';
import type { JournalSection } from '../../types';

interface SectionNodeProps {
  section: JournalSection;
  depth: number;
  modes?: Array<{ name: string; type: string }>;
}

const MODE_TYPE_RANK: Record<string, number> = {
  LFR: 0,
  NORMAL: 1,
  HEROIC: 2,
  MYTHIC: 3,
  MYTHIC_KEYSTONE: 3,
};

/**
 * Compute a difficulty tag if this section doesn't appear on all encounter modes.
 * Returns 'heroic' or 'mythic' if the section is restricted to those difficulties, null otherwise.
 */
function getDifficultyTag(
  difficultyMask: number | undefined,
  modes: Array<{ type: string }> | undefined,
): 'heroic' | 'mythic' | null {
  if (!modes || modes.length === 0) return null;
  if (difficultyMask == null || difficultyMask <= 0) return null;

  // Check if section appears on all modes
  const allModesMask = (1 << modes.length) - 1;
  if ((difficultyMask & allModesMask) === allModesMask) return null;

  // Find the minimum difficulty rank this section appears on
  let minRank = Infinity;
  for (let i = 0; i < modes.length; i++) {
    if (difficultyMask & (1 << i)) {
      const rank = MODE_TYPE_RANK[modes[i].type] ?? 1;
      if (rank < minRank) minRank = rank;
    }
  }

  if (minRank >= 3) return 'mythic';
  if (minRank >= 2) return 'heroic';
  return null;
}

const TAG_STYLES: Record<string, string> = {
  interruptible: 'bg-cyan-500/20 text-cyan-400',
  magic: 'bg-blue-500/20 text-blue-400',
  heroic: 'bg-orange-500/20 text-orange-400',
  mythic: 'bg-red-500/20 text-red-400',
  tank: 'bg-blue-500/20 text-blue-400',
  healer: 'bg-green-500/20 text-green-400',
  dps: 'bg-red-500/20 text-red-400',
  curse: 'bg-purple-500/20 text-purple-400',
  poison: 'bg-emerald-500/20 text-emerald-400',
  disease: 'bg-yellow-500/20 text-yellow-400',
  enrage: 'bg-orange-600/20 text-orange-500',
  important: 'bg-amber-500/20 text-amber-400',
  deadly: 'bg-red-600/20 text-red-500',
};

const TAG_LABELS: Record<string, string> = {
  interruptible: 'Interruptible',
  magic: 'Magic',
  heroic: 'Heroic',
  mythic: 'Mythic',
  tank: 'Tank',
  healer: 'Healer',
  dps: 'DPS',
  curse: 'Curse',
  poison: 'Poison',
  disease: 'Disease',
  enrage: 'Enrage',
  important: 'Important',
  deadly: 'Deadly',
};

export default function SectionNode({ section, depth, modes }: SectionNodeProps) {
  const hasChildren = section.sections && section.sections.length > 0;
  const isTopLevel = depth === 0;
  const isCollapsible = hasChildren || !!section.bodyText;
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const difficultyTag = getDifficultyTag(section.difficultyMask, modes);

  return (
    <div
      className={`mb-2 ${
        depth > 0 ? 'ml-6 border-l-2 border-wow-border' : ''
      } ${isTopLevel ? 'bg-wow-bg-elevated border border-wow-border rounded-xl' : ''}`}
    >
      {/* Header */}
      <div
        onClick={isCollapsible ? () => setExpanded(!expanded) : undefined}
        className={`px-4 py-2 select-none flex items-center gap-3 ${
          isCollapsible ? 'cursor-pointer hover:bg-wow-bg-hover/30 transition-colors duration-150' : ''
        } ${isTopLevel ? 'rounded-t-xl py-3' : ''}`}
      >
        {isCollapsible && (
          <span
            className="text-wow-text-secondary text-[10px] w-3 shrink-0 inline-flex transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <DownOutlined />
          </span>
        )}

        {section.spellId ? (
          <a
            href={`https://www.wowhead.com/spell=${section.spellId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 hover:brightness-125 transition-all"
          >
            {section.spellIcon ? (
              <img
                src={section.spellIcon}
                alt={section.title}
                title={section.title}
                className="w-8 h-8 rounded-lg object-cover border border-wow-border"
              />
            ) : isTopLevel ? (
              <div className="w-8 h-8 rounded-lg bg-wow-bg-raised text-wow-gold-muted flex items-center justify-center">
                <ThunderboltOutlined className="text-xs" />
              </div>
            ) : null}
          </a>
        ) : section.spellIcon ? (
          <img
            src={section.spellIcon}
            alt={section.title}
            title={section.title}
            className="w-8 h-8 rounded-lg object-cover border border-wow-border shrink-0"
          />
        ) : isTopLevel ? (
          <div className="w-8 h-8 rounded-lg bg-wow-bg-raised text-wow-gold-muted flex items-center justify-center shrink-0">
            <ThunderboltOutlined className="text-xs" />
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-semibold text-wow-text ${isTopLevel ? 'text-[15px]' : 'text-sm'}`}
            >
              {section.title}
            </span>
            {section.headerIcon && TAG_STYLES[section.headerIcon] && (
              <span
                className={`px-2 py-0.5 text-xs rounded-md font-medium ${TAG_STYLES[section.headerIcon]}`}
              >
                {TAG_LABELS[section.headerIcon]}
              </span>
            )}
            {difficultyTag && difficultyTag !== section.headerIcon && (
              <span
                className={`px-2 py-0.5 text-xs rounded-md font-medium ${TAG_STYLES[difficultyTag]}`}
              >
                {TAG_LABELS[difficultyTag]}
              </span>
            )}
            {section.spellId && (
              <span className="text-xs text-wow-text-secondary font-mono">({section.spellId})</span>
            )}
          </div>
          {!isCollapsible && section.bodyText && (
            <p className="text-zinc-300 text-[17px] leading-relaxed m-0 mt-0.5">
              {section.bodyText}
            </p>
          )}
        </div>
      </div>

      {/* Animated body */}
      {isCollapsible && (
        <div
          ref={contentRef}
          className="grid transition-[grid-template-rows] duration-200 ease-in-out"
          style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="pb-1">
              {section.bodyText && (
                <p className="text-zinc-300 text-[17px] leading-relaxed m-0 ml-[40px] pr-4">
                  {section.bodyText}
                </p>
              )}

              {hasChildren && (
                <div className="mt-2">
                  {section.sections!.map((child) => (
                    <SectionNode key={child.id} section={child} depth={depth + 1} modes={modes} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
