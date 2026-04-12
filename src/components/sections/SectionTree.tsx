import type { JournalSection } from '../../types';
import SectionNode from './SectionNode';

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
  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <SectionNode key={section.id} section={section} depth={0} modes={modes} expandTrigger={expandTrigger} />
      ))}
    </div>
  );
}
