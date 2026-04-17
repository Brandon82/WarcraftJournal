import { useMemo } from 'react';
import type { JournalSection } from '../../types';
import { collectSpells, renderWithSpellLinks, type SpellInfo } from '../sections/spellLinks';

interface OverviewTabProps {
  overviewSection?: JournalSection;
  description: string;
  allSections?: JournalSection[];
}

function TankIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7l-9-5z"
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M12 8v4m0 0v4m0-4h4m-4 0H8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function HealerIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="2" width="6" height="20" rx="1.5" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.8} />
      <rect x="2" y="9" width="20" height="6" rx="1.5" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.8} />
    </svg>
  );
}

function DpsIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.41 2.58a2 2 0 0 0-2.82 0L2.58 10.59a2 2 0 0 0 0 2.82l8.01 8.01a2 2 0 0 0 2.82 0l8.01-8.01a2 2 0 0 0 0-2.82l-8.01-8.01z"
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.8}
      />
      <path d="M12 8l4 4-4 4-4-4 4-4z" fill={color} fillOpacity={0.4} />
    </svg>
  );
}

const ROLE_CONFIG: Record<string, { icon: (color: string) => React.ReactNode; color: string; label: string }> = {
  Tank: {
    icon: (c) => <TankIcon color={c} />,
    color: '#5b9df5',
    label: 'Tank',
  },
  Healer: {
    icon: (c) => <HealerIcon color={c} />,
    color: '#4ade80',
    label: 'Healer',
  },
  'Damage Dealer': {
    icon: (c) => <DpsIcon color={c} />,
    color: '#f87171',
    label: 'Damage Dealer',
  },
};

function formatBodyText(text: string, spells: Map<string, SpellInfo>): React.ReactNode[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line, i) => {
    const cleaned = line.replace(/\$bullet;?\s*/g, '').trim();
    const isBullet = line.trimStart().startsWith('$bullet');
    const content = renderWithSpellLinks(cleaned, spells);
    if (isBullet) {
      return (
        <li key={i} className="text-wow-text-secondary text-sm leading-relaxed">
          {content}
        </li>
      );
    }
    return (
      <p key={i} className="text-wow-text-secondary text-sm leading-relaxed m-0">
        {content}
      </p>
    );
  });
}

function FormattedBody({ text, spells }: { text: string; spells: Map<string, SpellInfo> }) {
  const nodes = formatBodyText(text, spells);
  const hasBullets = text.includes('$bullet');
  if (hasBullets) {
    return (
      <ul className="list-disc pl-5 m-0 space-y-1">
        {nodes}
      </ul>
    );
  }
  return <>{nodes}</>;
}

export default function OverviewTab({ overviewSection, description, allSections }: OverviewTabProps) {
  const roleAlerts = overviewSection?.sections?.filter(
    (s) => s.title in ROLE_CONFIG,
  );

  const spellLookup = useMemo<Map<string, SpellInfo>>(
    () => collectSpells(allSections),
    [allSections],
  );

  return (
    <div>
      <p className="text-wow-text text-[15px] leading-relaxed mb-6 m-0">
        {description}
      </p>

      {overviewSection?.bodyText && (
        <div className="mb-6">
          <FormattedBody text={overviewSection.bodyText} spells={spellLookup} />
        </div>
      )}

      {roleAlerts && roleAlerts.length > 0 && (
        <div className="flex flex-col gap-3">
          {roleAlerts.map((alert) => {
            const config = ROLE_CONFIG[alert.title];
            return (
              <div
                key={alert.id}
                className="rounded-xl border border-wow-border bg-wow-bg-surface p-4"
                style={{ borderLeftWidth: '4px', borderLeftColor: config?.color }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="flex items-center">
                    {config?.icon(config.color)}
                  </span>
                  <h4 className="font-semibold m-0 text-sm" style={{ color: config?.color }}>
                    {alert.title}
                  </h4>
                </div>
                {alert.bodyText && (
                  <div className="ml-4 sm:ml-[26px]">
                    <FormattedBody text={alert.bodyText} spells={spellLookup} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
