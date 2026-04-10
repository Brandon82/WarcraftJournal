import { currentSeason } from '../data/currentSeason';
import InstanceCard from '../components/cards/InstanceCard';

export default function SeasonPage() {
  if (!currentSeason) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-wow-text mb-2">No Active Season</h2>
        <p className="text-wow-text-secondary">There is no current season configured.</p>
      </div>
    );
  }

  const season = currentSeason;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wow-gold opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-wow-gold" />
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold text-wow-gold m-0 tracking-wide">
          {season.name}
        </h2>
      </div>

      {season.raids.length > 0 && (
        <div className="mb-8">
          <h3 className="text-wow-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
            Raids
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {season.raids.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                linkPrefix="/season"
              />
            ))}
          </div>
        </div>
      )}

      {(season.dungeons.length > 0 || season.legacyDungeons.length > 0) && (
        <div>
          <h3 className="text-wow-text-secondary text-xs font-medium uppercase tracking-wider mb-3">
            Mythic+ Dungeons
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {season.dungeons.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                linkPrefix="/season"
              />
            ))}
            {season.legacyDungeons.map((d) => (
              <div
                key={d.name}
                className="bg-wow-bg-elevated border border-wow-border-subtle rounded-xl p-5"
              >
                <h4 className="text-wow-text text-sm font-medium m-0">
                  {d.name}
                </h4>
                <p className="text-wow-text-dim text-xs mt-1.5 m-0">
                  {d.origin}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
