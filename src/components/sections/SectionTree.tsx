import { useMemo } from 'react';
import type { JournalSection } from '../../types';
import SectionNode from './SectionNode';
import { collectSpells, type SpellInfo } from './spellLinks';

export interface ExpandTrigger {
  expand: boolean;
  version: number;
}

interface SectionTreeProps {
  sections: JournalSection[];
  modes?: Array<{ name: string; type: string }>;
  expandTrigger?: ExpandTrigger;
}

export default function SectionTree({ sections, modes, expandTrigger }: SectionTreeProps) {
  const spellLookup = useMemo<Map<string, SpellInfo>>(
    () => collectSpells(sections),
    [sections],
  );

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <SectionNode
          key={section.id}
          section={section}
          depth={0}
          modes={modes}
          expandTrigger={expandTrigger}
          spells={spellLookup}
        />
      ))}
    </div>
  );
}
