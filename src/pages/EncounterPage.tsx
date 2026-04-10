import { useParams } from 'react-router';
import { useState } from 'react';
import { Tabs } from 'antd';
import { useEncounter } from '../hooks/useEncounter';
import { useJournal } from '../context/JournalContext';
import { instanceBySlug } from '../data';
import DifficultySelector from '../components/encounter/DifficultySelector';
import OverviewTab from '../components/encounter/OverviewTab';
import AbilitiesTab from '../components/encounter/AbilitiesTab';
import LootTab from '../components/encounter/LootTab';

export default function EncounterPage() {
  const { bossSlug, instanceSlug } = useParams();
  const encounter = useEncounter(bossSlug);
  const { activeTab, setActiveTab } = useJournal();
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!encounter) {
    return (
      <div className="text-center py-16 text-wow-text-secondary">
        Encounter not found
      </div>
    );
  }

  const instance = instanceSlug ? instanceBySlug.get(instanceSlug) : undefined;
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
      {/* Boss header */}
      <div className="flex items-start gap-5 mb-6">
        <div className="relative shrink-0">
          {creatureImage ? (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-[3px] border-wow-gold-muted relative">
              {!imgLoaded && (
                <div className="absolute inset-0 bg-wow-bg-raised animate-pulse rounded-full" />
              )}
              <img
                src={creatureImage}
                alt={encounter.name}
                className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
              />
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-wow-border to-wow-bg-raised border-[3px] border-wow-gold-muted flex items-center justify-center text-3xl text-wow-gold-muted font-bold">
              {encounter.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="pt-1 sm:pt-2 min-w-0">
          {instance && (
            <p className="text-wow-text-dim text-xs uppercase tracking-wider font-medium m-0 mb-1">
              {instance.name}
            </p>
          )}
          <h2 className="text-2xl sm:text-3xl font-semibold text-wow-gold m-0 tracking-wide">
            {encounter.name}
          </h2>
          {encounter.creatures.length > 1 && (
            <p className="text-wow-text-secondary text-sm mt-1 m-0">
              {encounter.creatures.map((c) => c.name).join(', ')}
            </p>
          )}
          {encounter.modes.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {encounter.modes.map((mode) => (
                <span
                  key={mode.type}
                  className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded bg-wow-bg-raised text-wow-text-secondary border border-wow-border"
                >
                  {mode.name}
                </span>
              ))}
            </div>
          )}
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
