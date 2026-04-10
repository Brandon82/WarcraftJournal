import { useParams } from 'react-router';
import { Tabs } from 'antd';
import { useEncounter } from '../hooks/useEncounter';
import { useJournal } from '../context/JournalContext';
import DifficultySelector from '../components/encounter/DifficultySelector';
import OverviewTab from '../components/encounter/OverviewTab';
import AbilitiesTab from '../components/encounter/AbilitiesTab';
import LootTab from '../components/encounter/LootTab';

export default function EncounterPage() {
  const { bossSlug } = useParams();
  const encounter = useEncounter(bossSlug);
  const { activeTab, setActiveTab } = useJournal();

  if (!encounter) {
    return (
      <div className="text-center py-16 text-wow-text-secondary">
        Encounter not found
      </div>
    );
  }

  const overviewSection = encounter.sections.find(
    (s) => s.title.toLowerCase() === 'overview',
  );

  const creatureImage = encounter.creatures[0]?.creatureDisplayMedia;

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <OverviewTab
          overviewSection={overviewSection}
          description={encounter.description}
        />
      ),
    },
    {
      key: 'abilities',
      label: 'Abilities',
      children: <AbilitiesTab sections={encounter.sections} />,
    },
    {
      key: 'loot',
      label: 'Loot',
      children: <LootTab items={encounter.items} />,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-5 mb-6">
        {creatureImage ? (
          <img
            src={creatureImage}
            alt={encounter.name}
            className="w-20 h-20 rounded-full border-[3px] border-wow-gold-muted object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-wow-border to-wow-bg-raised border-[3px] border-wow-gold-muted flex items-center justify-center text-[28px] text-wow-gold-muted font-bold shrink-0">
            {encounter.name.charAt(0)}
          </div>
        )}
        <div>
          <h2 className="text-3xl font-semibold text-wow-gold m-0 tracking-wide">
            {encounter.name}
          </h2>
        </div>
      </div>

      <div className="mb-6">
        <DifficultySelector />
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
}
