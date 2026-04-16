import { useState } from 'react';
import { Link } from 'react-router';
import { NodeIndexOutlined, ToolOutlined } from '@ant-design/icons';
import { dataGeneratedAt, expansionBySlug, instanceBySlug } from '../data';
import { currentSeason } from '../data/currentSeason';

function BackgroundCard({
  to,
  bgUrls = [],
  children,
}: {
  to: string;
  bgUrls?: string[];
  children: React.ReactNode;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const currentBg = bgUrls[bgIndex];
  const showBg = !!currentBg;

  return (
    <Link to={to} className="no-underline block group">
      <div
        className="relative overflow-hidden rounded-xl border border-wow-border hover:border-wow-gold-muted transition-all duration-300 cursor-pointer"
        style={{ boxShadow: 'var(--wow-card-shadow)', minHeight: '180px' }}
      >
        {showBg && (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-wow-bg-raised animate-pulse" />
            )}
            <img
              src={currentBg}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setBgIndex((i) => i + 1)}
            />
            {imgLoaded && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />
            )}
          </>
        )}
        <div className={`relative flex flex-col justify-end h-full p-5 ${!showBg || !imgLoaded ? 'bg-wow-bg-surface' : ''}`}>
          {children}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const formattedDate = new Date(dataGeneratedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const midnight = expansionBySlug.get('midnight');
  const midnightBgCandidates = (() => {
    if (!midnight) return [];
    return [...midnight.raids, ...midnight.dungeons]
      .map((ref) => instanceBySlug.get(ref.slug)?.backgroundImage)
      .filter((url): url is string => !!url);
  })();

  const seasonBgCandidates = currentSeason
    ? [...currentSeason.raids, ...currentSeason.dungeons]
        .map((inst) => inst.backgroundImage)
        .filter((url): url is string => !!url)
    : [];

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-wow-gold mb-2 tracking-wide">
        Adventure Guide
      </h2>
      <p className="text-wow-text-secondary mb-1">
        Select an expansion or season to browse raids and dungeons.
      </p>
      <p className="text-xs text-wow-text-dim mb-8">
        Adventure journal data updated {formattedDate}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {currentSeason && (
          <BackgroundCard to="/season" bgUrls={seasonBgCandidates}>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wow-gold opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-wow-gold" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-wow-text-secondary">
                Current Season
              </span>
            </div>
            <h3 className="text-lg font-semibold m-0 text-wow-gold">
              {currentSeason.name}
            </h3>
            <p className="text-sm mt-1.5 m-0 text-wow-text-secondary">
              {currentSeason.raids.length} {currentSeason.raids.length === 1 ? 'Raid' : 'Raids'}
              {' · '}
              {currentSeason.dungeons.length + currentSeason.legacyDungeons.length} Dungeons
            </p>
          </BackgroundCard>
        )}

        {midnight && (
          <BackgroundCard to={`/${midnight.slug}`} bgUrls={midnightBgCandidates}>
            <h3 className="text-lg font-semibold m-0 text-wow-gold">
              {midnight.name}
            </h3>
            <p className="text-sm mt-1.5 m-0 text-wow-text-secondary">
              {midnight.raids.length} {midnight.raids.length === 1 ? 'Raid' : 'Raids'}
              {midnight.dungeons.length > 0 &&
                ` · ${midnight.dungeons.length} ${midnight.dungeons.length === 1 ? 'Dungeon' : 'Dungeons'}`}
            </p>
          </BackgroundCard>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Link to="/tools/mdt-route" className="no-underline block group">
          <div
            className="flex items-center gap-3 p-4 rounded-xl border border-wow-border hover:border-wow-gold-muted bg-wow-bg-surface transition-all duration-300"
            style={{ boxShadow: 'var(--wow-card-shadow)' }}
          >
            <NodeIndexOutlined className="text-wow-gold text-xl" />
            <div>
              <h3 className="text-base font-semibold m-0 text-wow-gold group-hover:text-wow-gold-bright transition-colors duration-150">
                M+ Route Helper
              </h3>
              <p className="text-xs m-0 text-wow-text-secondary">
                Visualize imported MDT routes
              </p>
            </div>
          </div>
        </Link>

        <Link to="/tools" className="no-underline block group">
          <div
            className="flex items-center gap-3 p-4 rounded-xl border border-wow-border hover:border-wow-gold-muted bg-wow-bg-surface transition-all duration-300"
            style={{ boxShadow: 'var(--wow-card-shadow)' }}
          >
            <ToolOutlined className="text-wow-gold text-xl" />
            <div>
              <h3 className="text-base font-semibold m-0 text-wow-gold group-hover:text-wow-gold-bright transition-colors duration-150">
                Useful Tools
              </h3>
              <p className="text-xs m-0 text-wow-text-secondary">
                Community sites for WoW
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
