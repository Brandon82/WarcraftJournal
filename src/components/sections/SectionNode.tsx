import { useState } from 'react';
import { ThunderboltOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
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
};

const TAG_LABELS: Record<string, string> = {
  interruptible: 'Interruptible',
  magic: 'Magic',
  heroic: 'Heroic',
  mythic: 'Mythic',
};

export default function SectionNode({ section, depth }: SectionNodeProps) {
  const hasChildren = section.sections && section.sections.length > 0;
  const isTopLevel = depth === 0;
  const isCollapsible = hasChildren || !!section.bodyText;
  const [expanded, setExpanded] = useState(isTopLevel);

  return (
    <div
      className={`mb-2 ${
        depth > 0 ? 'ml-6 border-l-2 border-wow-border' : ''
      } ${isTopLevel ? 'bg-wow-bg-raised rounded-lg' : ''}`}
    >
      {/* Header */}
      <div
        onClick={isCollapsible ? () => setExpanded(!expanded) : undefined}
        className={`px-4 py-3 select-none flex items-center gap-3 ${
          isCollapsible ? 'cursor-pointer' : ''
        }`}
      >
        {isCollapsible && (
          <span className="text-wow-text-secondary text-[10px] w-3 shrink-0">
            {expanded ? <DownOutlined /> : <RightOutlined />}
          </span>
        )}

        {section.spellIcon ? (
          <img
            src={section.spellIcon}
            alt={section.title}
            title={section.title}
            className="w-9 h-9 rounded object-cover border border-wow-border shrink-0"
          />
        ) : isTopLevel ? (
          <div className="w-9 h-9 rounded bg-wow-border text-wow-gold-muted flex items-center justify-center shrink-0">
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
                className={`px-2 py-0.5 text-xs rounded font-medium ${TAG_STYLES[section.headerIcon]}`}
              >
                {TAG_LABELS[section.headerIcon]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      {expanded && (
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
      )}
    </div>
  );
}
