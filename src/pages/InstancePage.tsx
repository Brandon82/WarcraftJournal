import { useParams, useLocation } from 'react-router';
import { useMemo, useState } from 'react';
import { useInstance } from '../hooks/useInstance';
import { useZoneSpells } from '../hooks/useZoneSpells';
import { getEncountersForInstance } from '../data';
import { getWarcraftLogsUrl } from '../data/warcraftlogs';
import EncounterCard from '../components/cards/EncounterCard';
import ZoneSpellSection from '../components/zone-spells/ZoneSpellSection';

export default function InstancePage() {
  const { expansionSlug, instanceSlug } = useParams();
  const isSeason = useLocation().pathname.startsWith('/season');
  const routePrefix = isSeason ? 'season' : (expansionSlug ?? '');
  const instance = useInstance(instanceSlug);
  const zoneSpells = useZoneSpells(instanceSlug);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const bossNames = useMemo(() => {
    if (!instanceSlug) return new Set<string>();
    const encounters = getEncountersForInstance(instanceSlug);
    return new Set(encounters.flatMap((e) => e.creatures.map((c) => c.name)));
  }, [instanceSlug]);

  if (!instance) {
    return (
      <div className="text-center py-16 text-wow-text-secondary">
        Instance not found
      </div>
    );
  }

  const warcraftLogsUrl = getWarcraftLogsUrl(instance.slug);
  const hasHero = !!instance.backgroundImage;

  return (
    <div>
      {/* Hero banner */}
      {hasHero && (
        <div className="relative overflow-hidden rounded-xl mb-8 -mt-2" style={{ height: '200px' }}>
          {!heroLoaded && (
            <div className="absolute inset-0 bg-wow-bg-raised animate-pulse rounded-xl" />
          )}
          <img
            src={instance.backgroundImage}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setHeroLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <span
              className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                instance.category === 'raid'
                  ? 'bg-orange-500/25 text-orange-300 border border-orange-400/30'
                  : 'bg-blue-500/25 text-blue-300 border border-blue-400/30'
              }`}
            >
              {instance.category === 'raid' ? 'Raid' : 'Dungeon'}
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-white m-0 tracking-wide drop-shadow-lg">
                {instance.name}
              </h2>
              {warcraftLogsUrl && (
                <a
                  href={warcraftLogsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-150 text-zinc-200 hover:text-white no-underline text-xs font-medium"
                  title="View on Warcraft Logs"
                >
                  <img src="/logos/warcraftlogs.png" alt="" className="w-4 h-4 rounded object-contain" />
                  Logs
                </a>
              )}
            </div>
            {instance.description && (
              <p className="text-zinc-300 text-sm mt-1.5 m-0 max-w-[600px] leading-relaxed line-clamp-2">
                {instance.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Fallback header when no hero image */}
      {!hasHero && (
        <div className="mb-6">
          <span
            className={`inline-block px-3 py-1 rounded-lg text-xs font-medium uppercase tracking-wider border ${
              instance.category === 'raid'
                ? 'bg-wow-bg-raised text-orange-400 border-orange-400/30'
                : 'bg-wow-bg-raised text-blue-400 border-blue-400/30'
            }`}
          >
            {instance.category === 'raid' ? 'Raid' : 'Dungeon'}
          </span>
          <div className="flex items-center gap-3 mt-3 mb-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-wow-gold m-0 tracking-wide">
              {instance.name}
            </h2>
            {warcraftLogsUrl && (
              <a
                href={warcraftLogsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-wow-bg-raised hover:bg-wow-bg-surface border border-wow-border hover:border-wow-gold-muted transition-colors duration-150 text-wow-text-secondary hover:text-wow-gold no-underline text-xs font-medium"
                title="View on Warcraft Logs"
              >
                <img src="/logos/warcraftlogs.png" alt="" className="w-4 h-4 rounded object-contain" />
                Logs
              </a>
            )}
          </div>
          {instance.description && (
            <p className="text-wow-text-secondary leading-relaxed max-w-[700px] m-0">
              {instance.description}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {instance.encounters.map((enc, index) => (
          <EncounterCard
            key={enc.id}
            encounterRef={enc}
            index={index}
            expansionSlug={routePrefix}
            instanceSlug={instanceSlug ?? ''}
          />
        ))}
      </div>

      {zoneSpells && zoneSpells.npcs.length > 0 && (
        <ZoneSpellSection npcs={zoneSpells.npcs} bossNames={bossNames} category={instance.category} />
      )}
    </div>
  );
}
