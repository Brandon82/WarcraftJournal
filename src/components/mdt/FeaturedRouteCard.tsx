import { useMemo, useState } from 'react';
import { decodeMdtString } from '../../lib/mdt/decodeRoute';
import { parseMdtRoute } from '../../lib/mdt/parseRoute';
import { instanceBySlug, type RaiderIORoute, type RaiderIOPlayer } from '../../data';

interface FeaturedRouteCardProps {
  instanceSlug: string;
  route: RaiderIORoute;
  isCurrent: boolean;
  onLoad: (route: RaiderIORoute) => void;
}

// Standard WoW class colors, keyed by raider.io class slug.
const CLASS_COLORS: Record<string, string> = {
  'death-knight': '#C41E3A',
  'demon-hunter': '#A330C9',
  druid: '#FF7C0A',
  evoker: '#33937F',
  hunter: '#AAD372',
  mage: '#3FC7EB',
  monk: '#00FF98',
  paladin: '#F48CBA',
  priest: '#FFFFFF',
  rogue: '#FFF468',
  shaman: '#0070DD',
  warlock: '#8788EE',
  warrior: '#C69B6D',
};

const ROLE_RANK: Record<string, number> = { tank: 0, healer: 1, dps: 2 };

/** Landing-page card for a top raider.io/keystone.guru route. Visually
 *  mirrors SavedRouteCard (dungeon image, gradient overlay) but surfaces
 *  the source run's key level, clear time, completion date, and roster so
 *  users can pick a run from a known team. */
export default function FeaturedRouteCard({
  instanceSlug,
  route,
  isCurrent,
  onLoad,
}: FeaturedRouteCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const pullCount = useMemo(() => {
    try {
      const raw = decodeMdtString(route.mdtString);
      const parsed = parseMdtRoute(raw);
      return parsed.pulls.length;
    } catch {
      return null;
    }
  }, [route.mdtString]);

  const instance = instanceBySlug.get(instanceSlug);
  const backgroundImage = instance?.backgroundImage;
  const hasImage = !!backgroundImage;
  const dungeonName = instance?.name ?? route.source.dungeonName;
  const clearTime = formatMs(route.source.clearTimeMs);
  const completedAt = formatDate(route.source.completedAt);
  const players = useMemo<RaiderIOPlayer[]>(
    () =>
      [...route.source.players].sort(
        (a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9),
      ),
    [route.source.players],
  );
  const playerTitle = players
    .map((p) => `${p.name} — ${p.specName} ${p.className} (${p.role})`)
    .join('\n');

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
        isCurrent
          ? 'border-wow-gold-muted ring-2 ring-wow-gold-muted/40'
          : 'border-wow-border hover:border-wow-gold-muted'
      }`}
      style={{
        boxShadow: 'var(--wow-card-shadow)',
        aspectRatio: hasImage ? '16 / 9' : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => onLoad(route)}
        className="block w-full h-full text-left cursor-pointer p-0 m-0 border-0 bg-transparent"
        title={playerTitle || undefined}
      >
        {hasImage && (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-wow-bg-raised animate-pulse" />
            )}
            <img
              src={backgroundImage}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          </>
        )}

        <div
          className={`relative ${
            hasImage
              ? 'flex flex-col justify-end h-full p-2'
              : 'bg-wow-bg-surface px-2 py-2'
          }`}
        >
          <div
            className={`inline-flex items-center gap-1 self-start rounded px-1 py-0.5 mb-1 text-[9px] font-semibold uppercase tracking-wider ${
              hasImage
                ? 'bg-black/40 text-wow-gold'
                : 'bg-wow-bg-raised text-wow-gold'
            }`}
          >
            <span>+{route.source.mythicLevel}</span>
            <span className="opacity-60">·</span>
            <span>#{route.source.rank}</span>
          </div>
          <div
            className={`font-semibold text-xs truncate ${
              hasImage ? 'text-white' : 'text-wow-gold'
            }`}
          >
            {dungeonName}
          </div>
          <div
            className={`text-[11px] truncate ${
              hasImage ? 'text-zinc-300' : 'text-wow-text-secondary'
            }`}
          >
            Top raider.io route
          </div>
          <div
            className={`mt-1 flex items-center gap-1.5 text-[10px] font-mono ${
              hasImage ? 'text-zinc-300' : 'text-wow-text-dim'
            }`}
          >
            <span className="shrink-0">{clearTime}</span>
            {pullCount != null && (
              <>
                <span className="opacity-40">·</span>
                <span className="shrink-0">
                  {pullCount} {pullCount === 1 ? 'pull' : 'pulls'}
                </span>
              </>
            )}
            {completedAt && (
              <>
                <span className="opacity-40">·</span>
                <span className="shrink-0">{completedAt}</span>
              </>
            )}
          </div>
          {players.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              {players.map((p, i) => (
                <span
                  key={`${p.name}-${i}`}
                  className="h-1.5 w-4 rounded-sm ring-1 ring-black/40"
                  style={{ backgroundColor: CLASS_COLORS[p.classSlug] ?? '#888' }}
                  aria-label={`${p.name} (${p.className})`}
                />
              ))}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
