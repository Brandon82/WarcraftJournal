import type { JournalSection } from '../../types';
import SectionNode from './SectionNode';

interface SectionTreeProps {
  sections: JournalSection[];
  modes?: Array<{ name: string; type: string }>;
}

export default function SectionTree({ sections, modes }: SectionTreeProps) {
  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <SectionNode key={section.id} section={section} depth={0} modes={modes} />
      ))}
    </div>
  );
}
