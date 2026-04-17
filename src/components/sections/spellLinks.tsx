import { Tooltip } from 'antd';
import type { JournalSection } from '../../types';

export interface SpellInfo {
  id: number;
  title: string;
  description?: string;
  icon?: string;
}

export function collectSpells(
  sections: JournalSection[] | undefined,
  acc: Map<string, SpellInfo> = new Map(),
): Map<string, SpellInfo> {
  if (!sections) return acc;
  for (const s of sections) {
    if (s.spellId && s.title) {
      const key = s.title.toLowerCase();
      const existing = acc.get(key);
      if (!existing || (!existing.description && s.bodyText)) {
        acc.set(key, {
          id: s.spellId,
          title: s.title,
          description: s.bodyText,
          icon: s.spellIcon,
        });
      }
    }
    collectSpells(s.sections, acc);
  }
  return acc;
}

function SpellTooltipContent({ spell }: { spell: SpellInfo }) {
  const cleanedDescription = spell.description
    ?.replace(/\$bullet;?\s*/g, '• ')
    .replace(/\[([^\]]+)\]/g, '$1');
  return (
    <div className="max-w-xs">
      <div className="flex items-center gap-2 mb-1.5">
        {spell.icon && (
          <img
            src={spell.icon}
            alt=""
            className="w-8 h-8 rounded border border-wow-border shrink-0"
          />
        )}
        <div className="font-semibold text-wow-gold text-sm leading-tight">
          {spell.title}
        </div>
      </div>
      {cleanedDescription && (
        <div className="text-wow-text-secondary text-xs leading-relaxed whitespace-pre-line">
          {cleanedDescription}
        </div>
      )}
    </div>
  );
}

function SpellLink({ name, spell }: { name: string; spell?: SpellInfo }) {
  const href = spell
    ? `https://www.wowhead.com/spell=${spell.id}`
    : `https://www.wowhead.com/search?q=${encodeURIComponent(name)}`;
  const anchor = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-wow-gold hover:text-wow-gold-muted underline decoration-wow-gold/40 hover:decoration-wow-gold-muted underline-offset-2 transition-colors"
    >
      {name}
    </a>
  );
  if (!spell) return anchor;
  return (
    <Tooltip
      title={<SpellTooltipContent spell={spell} />}
      color="var(--color-wow-bg-raised, #1a1512)"
      mouseEnterDelay={0.15}
      styles={{
        container: {
          border: '1px solid var(--color-wow-border, #3a2f22)',
          padding: '10px 12px',
        },
      }}
    >
      {anchor}
    </Tooltip>
  );
}

export function renderWithSpellLinks(
  text: string,
  spells: Map<string, SpellInfo>,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const name = match[1];
    const spell = spells.get(name.toLowerCase());
    parts.push(<SpellLink key={key++} name={name} spell={spell} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
