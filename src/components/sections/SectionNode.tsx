import { useState, useRef } from 'react';
import { ThunderboltOutlined, DownOutlined } from '@ant-design/icons';
import type { JournalSection } from '../../types';

interface SectionNodeProps {
  section: JournalSection;
  depth: number;
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

export default function SectionNode({ section, depth }: SectionNodeProps) {
  const hasChildren = section.sections && section.sections.length > 0;
  const isTopLevel = depth === 0;
  const isCollapsible = hasChildren || !!section.bodyText;
  const [expanded, setExpanded] = useState(isTopLevel);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`mb-2 ${
        depth > 0 ? 'ml-6 border-l-2 border-wow-border' : ''
      } ${isTopLevel ? 'bg-wow-bg-elevated border border-wow-border rounded-xl' : ''}`}
    >
      {/* Header */}
      <div
        onClick={isCollapsible ? () => setExpanded(!expanded) : undefined}
        className={`px-4 py-3 select-none flex items-center gap-3 ${
          isCollapsible ? 'cursor-pointer hover:bg-wow-bg-hover/30 transition-colors duration-150' : ''
        } ${isTopLevel ? 'rounded-t-xl' : ''}`}
      >
        {isCollapsible && (
          <span
            className="text-wow-text-secondary text-[10px] w-3 shrink-0 inline-flex transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <DownOutlined />
          </span>
        )}

        {section.spellIcon ? (
          <img
            src={section.spellIcon}
            alt={section.title}
            title={section.title}
            className="w-9 h-9 rounded-lg object-cover border border-wow-border shrink-0"
          />
        ) : isTopLevel ? (
          <div className="w-9 h-9 rounded-lg bg-wow-bg-raised text-wow-gold-muted flex items-center justify-center shrink-0">
            <ThunderboltOutlined />
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-semibold ${
                section.spellId ? 'text-wow-gold' : 'text-wow-text'
              } ${isTopLevel ? 'text-[15px]' : 'text-sm'}`}
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
          </div>
        </div>
      </div>

      {/* Animated body */}
      <div
        ref={contentRef}
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-4 pb-3">
            {section.bodyText && (
              <p
                className={`text-wow-text-secondary text-[13px] leading-relaxed m-0 ${
                  isCollapsible ? 'ml-6' : ''
                }`}
              >
                {section.bodyText}
              </p>
            )}

            {hasChildren && (
              <div className="mt-2">
                {section.sections!.map((child) => (
                  <SectionNode key={child.id} section={child} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
