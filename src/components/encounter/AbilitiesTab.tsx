import type { JournalSection } from '../../types';
import SectionTree from '../sections/SectionTree';

interface AbilitiesTabProps {
  sections: JournalSection[];
}

export default function AbilitiesTab({ sections }: AbilitiesTabProps) {
  const abilitySections = sections.filter(
    (s) => s.title.toLowerCase() !== 'overview',
  );

  if (abilitySections.length === 0) {
    return (
      <div className="text-center py-16 text-wow-text-secondary">
        No ability data available
      </div>
    );
  }

  return <SectionTree sections={abilitySections} />;
}
