import { useMemo, useState } from 'react';
import { Modal } from 'antd';
import { instanceBySlug, type WarcraftLogsRun, type WarcraftLogsPlayer } from '../../data';

export type WarcraftLogsMode = 'normal' | 'learning';

interface WarcraftLogsRunCardProps {
  instanceSlug: string;
  run: WarcraftLogsRun;
  mode?: WarcraftLogsMode;
}

/** Views offered in Learning mode. Each suffix is appended to the report
 *  URL (which already ends in `#fight=<id>`) so WCL lands on the matching
 *  sub-tab. Rendered as individual links inside a modal because popup
 *  blockers suppress multi-tab-on-single-click, and because surfacing
 *  them inline clutters the card. */
const LEARNING_LINKS: { label: string; description: string; suffix: string }[] = [
  { label: 'Overview', description: 'Main report summary', suffix: '' },
  { label: 'Debuffs', description: 'Debuffs applied to players', suffix: '&type=auras&spells=debuffs' },
  { label: 'Enemy auras', description: 'Auras on hostile units', suffix: '&type=auras&hostility=1' },
  { label: 'Enemy casts', description: 'Casts by hostile units', suffix: '&type=casts&hostility=1' },
  { label: 'Damage taken', description: 'Damage taken breakdown', suffix: '&type=damage-taken' },
];

// Keyed by the class slug our script produces (slugify of WCL class name:
// "Death Knight" → "death-knight", "Demon Hunter" → "demon-hunter", etc.).
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

/** Landing-page card for a top Warcraft Logs run. Visually mirrors
 *  FeaturedRouteCard but renders as an outbound link — WCL hosts combat
 *  logs, not routes. Normal mode: click opens the report in a new tab.
 *  Learning mode: click opens a picker modal with links to 4 auxiliary
 *  WCL views (debuffs, enemy auras, enemy casts, damage taken) plus the
 *  overview. */
export default function WarcraftLogsRunCard({ instanceSlug, run, mode = 'normal' }: WarcraftLogsRunCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { source } = run;
  const instance = instanceBySlug.get(instanceSlug);
  const backgroundImage = instance?.backgroundImage;
  const hasImage = !!backgroundImage;
  const dungeonName = instance?.name ?? source.dungeonName;
  const clearTime = formatMs(source.durationMs);
  const startedAt = formatDate(source.startedAt);
  const players = useMemo<WarcraftLogsPlayer[]>(
    () =>
      [...source.players].sort(
        (a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9),
      ),
    [source.players],
  );
  const playerTitle = players
    .map((p) => `${p.name} — ${p.specName} ${p.className} (${p.role})`)
    .join('\n');

  const handleCardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (mode !== 'learning') return;
    // Let modifier clicks (cmd/ctrl/shift/middle) fall through to the
    // native anchor so power users can still open the raw report directly.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setPickerOpen(true);
  };

  const cardBody = (
    <>
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
          {source.mythicLevel > 0 && <span>+{source.mythicLevel}</span>}
          {source.mythicLevel > 0 && <span className="opacity-60">·</span>}
          <span>#{source.rank}</span>
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
          Top Warcraft Logs run
        </div>
        <div
          className={`mt-1 flex items-center gap-1.5 text-[10px] font-mono ${
            hasImage ? 'text-zinc-300' : 'text-wow-text-dim'
          }`}
        >
          <span className="shrink-0">{clearTime}</span>
          {startedAt && (
            <>
              <span className="opacity-40">·</span>
              <span className="shrink-0">{startedAt}</span>
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
    </>
  );

  return (
    <>
      <div
        className="group relative overflow-hidden rounded-xl border border-wow-border hover:border-wow-gold-muted transition-all duration-300"
        style={{
          boxShadow: 'var(--wow-card-shadow)',
          aspectRatio: hasImage ? '16 / 9' : undefined,
        }}
      >
        <a
          href={source.reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCardClick}
          className="block w-full h-full text-left cursor-pointer no-underline"
          title={playerTitle || undefined}
        >
          {cardBody}
        </a>
      </div>

      {mode === 'learning' && (
        <Modal
          open={pickerOpen}
          onCancel={() => setPickerOpen(false)}
          footer={null}
          title={`${dungeonName} Learning views`}
          width={420}
          destroyOnHidden
        >
          <p className="text-xs text-wow-text-secondary mt-0 mb-3">
            Open any combination of WCL views for this run. Each opens in a
            new tab.
          </p>
          <div className="flex flex-col gap-2">
            {LEARNING_LINKS.map(({ label, description, suffix }) => (
              <a
                key={label}
                href={`${source.reportUrl}${suffix}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-baseline justify-between gap-3 rounded-md border border-wow-border bg-wow-bg-surface px-3 py-2 no-underline hover:border-wow-gold-muted hover:bg-wow-bg-raised transition-colors"
              >
                <span className="text-sm font-semibold text-wow-gold">{label}</span>
                <span className="text-[11px] text-wow-text-dim">{description}</span>
              </a>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
