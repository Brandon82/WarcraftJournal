import { instanceBySlug, expansionBySlug } from './index';
import type { JournalInstance } from '../types';

export interface LegacyDungeon {
  name: string;
  origin: string;
}

export interface CurrentSeason {
  name: string;
  expansionSlug: string;
  raids: JournalInstance[];
  dungeons: JournalInstance[];
  legacyDungeons: LegacyDungeon[];
}

// Midnight Season 1 M+ dungeon pool (4 Midnight + 4 legacy)
const CURRENT_SEASON_RAID_SLUGS = [
  'the-voidspire',
  'the-dreamrift',
  'march-on-queldanas',
];

const CURRENT_SEASON_DUNGEON_SLUGS = [
  'magisters-terrace',
  'maisara-caverns',
  'nexus-point-xenas',
  'windrunner-spire',
  // Legacy dungeons (fetched via EXTRA_INSTANCE_NAMES in fetch-data.ts)
  'pit-of-saron',
  'skyreach',
  'seat-of-the-triumvirate',
  'algethar-academy',
];

// Fallback display for legacy dungeons not yet in local data
const LEGACY_DUNGEON_FALLBACKS: LegacyDungeon[] = [
  { name: 'Pit of Saron', origin: 'Wrath of the Lich King' },
  { name: 'Skyreach', origin: 'Warlords of Draenor' },
  { name: 'Seat of the Triumvirate', origin: 'Legion' },
  { name: "Algeth'ar Academy", origin: 'Dragonflight' },
];

const CURRENT_EXPANSION_SLUG = 'midnight';

function resolveInstances(slugs: string[]): JournalInstance[] {
  return slugs
    .map((s) => instanceBySlug.get(s))
    .filter((i): i is JournalInstance => i !== undefined);
}

export const currentSeason: CurrentSeason | null = (() => {
  const expansion = expansionBySlug.get(CURRENT_EXPANSION_SLUG);
  if (!expansion) return null;
  const raids = resolveInstances(CURRENT_SEASON_RAID_SLUGS);
  const dungeons = resolveInstances(CURRENT_SEASON_DUNGEON_SLUGS);

  // Show fallback cards for legacy dungeons not yet fetched
  const resolvedSlugs = new Set(dungeons.map((d) => d.slug));
  const legacyDungeons = LEGACY_DUNGEON_FALLBACKS.filter(
    (ld) => {
      const slug = ld.name.toLowerCase().replace(/[']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return !resolvedSlugs.has(slug);
    },
  );

  if (raids.length === 0 && dungeons.length === 0) return null;
  return {
    name: 'Midnight Season 1',
    expansionSlug: CURRENT_EXPANSION_SLUG,
    raids,
    dungeons,
    legacyDungeons,
  };
})();
