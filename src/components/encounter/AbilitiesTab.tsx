import { InboxOutlined } from '@ant-design/icons';
import type { JournalSection } from '../../types';
import SectionTree from '../sections/SectionTree';

interface AbilitiesTabProps {
  sections: JournalSection[];
  modes: Array<{ name: string; type: string }>;
}

export default function AbilitiesTab({ sections, modes }: AbilitiesTabProps) {
  const abilitySections = sections.filter(
    (s) => s.title.toLowerCase() !== 'overview',
  );

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

  return <SectionTree sections={abilitySections} modes={modes} />;
}
