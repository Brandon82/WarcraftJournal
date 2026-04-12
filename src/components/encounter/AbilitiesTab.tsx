import { useState } from 'react';
import { InboxOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import type { JournalSection } from '../../types';
import SectionTree from '../sections/SectionTree';
import type { ExpandTrigger } from '../sections/SectionTree';

interface AbilitiesTabProps {
  sections: JournalSection[];
  modes: Array<{ name: string; type: string }>;
}

export default function AbilitiesTab({ sections, modes }: AbilitiesTabProps) {
  const abilitySections = sections.filter(
    (s) => s.title.toLowerCase() !== 'overview',
  );
  const [expandTrigger, setExpandTrigger] = useState<ExpandTrigger>({ expand: false, version: 0 });
  const allExpanded = expandTrigger.expand && expandTrigger.version > 0;

  if (abilitySections.length === 0) {
    return (
      <div className="text-center py-16">
        <InboxOutlined className="text-3xl text-wow-text-dim/40 mb-3" />
        <p className="text-wow-text-secondary text-sm m-0">
          No ability data available for this encounter
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setExpandTrigger({ expand: !allExpanded, version: expandTrigger.version + 1 })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wow-text-secondary hover:text-wow-text bg-wow-bg-raised hover:bg-wow-bg-hover border border-wow-border rounded-lg transition-colors cursor-pointer"
        >
          {allExpanded ? <UpOutlined className="text-[10px]" /> : <DownOutlined className="text-[10px]" />}
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      <SectionTree sections={abilitySections} modes={modes} expandTrigger={expandTrigger} />
    </div>
  );
}
