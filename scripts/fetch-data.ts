/**
 * Blizzard API Data Fetcher
 *
 * Fetches WoW Journal data (expansions, instances, encounters) from the
 * Blizzard Game Data API and writes processed JSON to src/data/generated/.
 *
 * Usage: npx tsx scripts/fetch-data.ts
 *
 * Requires BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGION = 'us';
const LOCALE = 'en_US';
const NAMESPACE = 'static-us';
const API_BASE = `https://${REGION}.api.blizzard.com`;
const AUTH_URL = 'https://oauth.battle.net/token';

const OUTPUT_DIR = path.resolve(__dirname, '../src/data/generated');

let accessToken = '';

async function authenticate(): Promise<void> {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing BLIZZARD_CLIENT_ID or BLIZZARD_CLIENT_SECRET in environment. ' +
        'Copy .env.example to .env and fill in your credentials from https://develop.battle.net/',
    );
  }

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  console.log('Authenticated with Blizzard API');
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE}${endpoint}${separator}namespace=${NAMESPACE}&locale=${LOCALE}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchMedia(endpoint: string): Promise<string | undefined> {
  try {
    const data = await apiGet<{ assets?: Array<{ key: string; value: string }> }>(endpoint);
    return data.assets?.find((a) => a.key === 'icon')?.value ?? data.assets?.[0]?.value;
  } catch {
    return undefined;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface BlizzardExpansionIndex {
  tiers: Array<{
    id: number;
    name: string;
  }>;
}

interface BlizzardExpansionDetail {
  id: number;
  name: string;
  dungeons?: Array<{ id: number; name: string }>;
  raids?: Array<{ id: number; name: string }>;
  instances?: Array<{ id: number; name: string }>;
}

interface BlizzardInstanceDetail {
  id: number;
  name: string;
  description?: string;
  map?: { name: string };
  category?: { type: string };
  encounters?: Array<{ id: number; name: string }>;
  modes?: Array<{ mode: { name: string; type: string } }>;
  media?: { key: { href: string } };
  expansion?: { id: number; name: string };
}

interface BlizzardEncounterDetail {
  id: number;
  name: string;
  description?: string;
  creatures?: Array<{
    id: number;
    name: string;
    creature_display?: { id: number; key?: { href: string } };
  }>;
  sections?: Array<BlizzardSection>;
  items?: Array<{
    id: number;
    item: { id: number; name: string; key?: { href: string } };
  }>;
  modes?: Array<{ name: string; type: string }>;
  instance?: { id: number; name: string };
}

interface BlizzardSection {
  id: number;
  title: string;
  body_text?: string;
  sections?: BlizzardSection[];
  spell?: { id: number; name: string; key?: { href: string } };
  creature_display?: { id: number; key?: { href: string } };
}

interface BlizzardItemDetail {
  id: number;
  name: string;
  quality?: { type: string; name: string };
  level?: number;
  media?: { id: number; key?: { href: string } };
}

async function fetchAllExpansions() {
  console.log('Fetching expansion index...');
  const index = await apiGet<BlizzardExpansionIndex>('/data/wow/journal-expansion/index');

  const expansions = [];
  for (const tier of index.tiers) {
    console.log(`  Fetching expansion: ${tier.name}`);
    try {
      const detail = await apiGet<BlizzardExpansionDetail>(
        `/data/wow/journal-expansion/${tier.id}`,
      );

      expansions.push({
        id: detail.id,
        name: detail.name,
        slug: slugify(detail.name),
        dungeons: (detail.dungeons ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          slug: slugify(d.name),
        })),
        raids: (detail.raids ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          slug: slugify(r.name),
        })),
      });
    } catch (err) {
      console.warn(`  Failed to fetch expansion ${tier.id}: ${err}`);
    }
  }

  return expansions;
}

async function fetchInstance(instanceId: number) {
  const detail = await apiGet<BlizzardInstanceDetail>(
    `/data/wow/journal-instance/${instanceId}`,
  );

  let backgroundImage: string | undefined;
  if (detail.media?.key?.href) {
    try {
      const mediaUrl = detail.media.key.href;
      const mediaResp = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (mediaResp.ok) {
        const mediaData = await mediaResp.json();
        backgroundImage = mediaData.assets?.[0]?.value;
      }
    } catch { /* skip */ }
  }

  const category: string =
    detail.category?.type?.toLowerCase() === 'raid' ? 'raid' :
    detail.category?.type?.toLowerCase() === 'dungeon' ? 'dungeon' :
    'dungeon';

  return {
    id: detail.id,
    name: detail.name,
    slug: slugify(detail.name),
    description: detail.description ?? '',
    category,
    expansionId: detail.expansion?.id ?? 0,
    backgroundImage,
    encounters: (detail.encounters ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      slug: slugify(e.name),
    })),
    modes: (detail.modes ?? []).map((m) => ({
      name: m.mode.name,
      type: m.mode.type,
    })),
  };
}

async function fetchSpellTooltip(spellId: number): Promise<string | undefined> {
  try {
    const response = await fetch(`https://nether.wowhead.com/tooltip/spell/${spellId}`);
    if (!response.ok) return undefined;
    const data = await response.json();
    if (!data.tooltip) return undefined;
    // Extract description: strip HTML, then take text after the header table
    const plain = (data.tooltip as string)
      .replace(/<table>.*?<\/table>/s, '') // Remove the first header table (name, range, cast time)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plain || undefined;
  } catch {
    return undefined;
  }
}

async function processSection(section: BlizzardSection): Promise<Record<string, unknown>> {
  let spellIcon: string | undefined;
  if (section.spell?.id) {
    spellIcon = await fetchMedia(`/data/wow/media/spell/${section.spell.id}`);
  }

  let creatureDisplayMedia: string | undefined;
  if (section.creature_display?.id) {
    creatureDisplayMedia = await fetchMedia(
      `/data/wow/media/creature-display/${section.creature_display.id}`,
    );
  }

  // If no body_text from Blizzard API but has a spell, fetch description from Wowhead
  let bodyText = section.body_text;
  if (!bodyText && section.spell?.id) {
    bodyText = await fetchSpellTooltip(section.spell.id);
  }

  const children = [];
  if (section.sections) {
    for (const child of section.sections) {
      children.push(await processSection(child));
    }
  }

  return {
    id: section.id,
    title: section.title,
    ...(bodyText ? { bodyText } : {}),
    ...(children.length > 0 ? { sections: children } : {}),
    ...(section.spell?.id ? { spellId: section.spell.id } : {}),
    ...(spellIcon ? { spellIcon } : {}),
    ...(section.creature_display?.id
      ? { creatureDisplayId: section.creature_display.id }
      : {}),
    ...(creatureDisplayMedia ? { creatureDisplayMedia } : {}),
  };
}

async function fetchEncounter(encounterId: number, instanceSlug: string) {
  const detail = await apiGet<BlizzardEncounterDetail>(
    `/data/wow/journal-encounter/${encounterId}`,
  );

  const creatures = [];
  for (const c of detail.creatures ?? []) {
    let creatureDisplayMedia: string | undefined;
    if (c.creature_display?.id) {
      creatureDisplayMedia = await fetchMedia(
        `/data/wow/media/creature-display/${c.creature_display.id}`,
      );
    }
    creatures.push({
      id: c.id,
      name: c.name,
      ...(c.creature_display?.id ? { creatureDisplayId: c.creature_display.id } : {}),
      ...(creatureDisplayMedia ? { creatureDisplayMedia } : {}),
    });
  }

  const sections = [];
  for (const s of detail.sections ?? []) {
    sections.push(await processSection(s));
  }

  const items = [];
  for (const itemEntry of detail.items ?? []) {
    try {
      const itemDetail = await apiGet<BlizzardItemDetail>(
        `/data/wow/item/${itemEntry.item.id}`,
      );
      let iconUrl: string | undefined;
      if (itemDetail.media?.id) {
        iconUrl = await fetchMedia(`/data/wow/media/item/${itemDetail.media.id}`);
      }
      items.push({
        id: itemDetail.id,
        name: itemDetail.name,
        quality: itemDetail.quality?.type ?? 'COMMON',
        ...(iconUrl ? { iconUrl } : {}),
        ...(itemDetail.level ? { itemLevel: itemDetail.level } : {}),
      });
    } catch {
      items.push({
        id: itemEntry.item.id,
        name: itemEntry.item.name,
        quality: 'COMMON',
      });
    }
  }

  return {
    id: detail.id,
    name: detail.name,
    slug: slugify(detail.name),
    description: detail.description ?? '',
    instanceId: detail.instance?.id ?? 0,
    instanceSlug,
    creatures,
    sections,
    items,
    modes: (detail.modes ?? []).map((m) => ({
      name: m.name,
      type: m.type,
    })),
  };
}

// Parse --expansion flag from CLI args (e.g., --expansion midnight)
const EXPANSION_FILTER = (() => {
  const idx = process.argv.indexOf('--expansion');
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1].toLowerCase() : null;
})();

async function main() {
  // Load .env manually
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await authenticate();

  // 1. Fetch all expansions
  let expansions = await fetchAllExpansions();

  if (EXPANSION_FILTER) {
    expansions = expansions.filter(
      (e) => e.slug === EXPANSION_FILTER || e.name.toLowerCase() === EXPANSION_FILTER,
    );
    if (expansions.length === 0) {
      console.error(`No expansion matched "${EXPANSION_FILTER}". Available expansions:`);
      const all = await fetchAllExpansions();
      all.forEach((e) => console.error(`  - ${e.name} (${e.slug})`));
      process.exit(1);
    }
    console.log(`Filtering to expansion: ${expansions[0].name}`);
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'expansions.json'),
    JSON.stringify(expansions, null, 2),
  );
  console.log(`Wrote ${expansions.length} expansions`);

  // 2. Fetch instances
  const allInstances = [];
  const allInstanceIds = new Set<number>();
  for (const exp of expansions) {
    for (const ref of [...exp.raids, ...exp.dungeons]) {
      allInstanceIds.add(ref.id);
    }
  }

  console.log(`\nFetching ${allInstanceIds.size} instances...`);
  for (const id of allInstanceIds) {
    try {
      console.log(`  Fetching instance ${id}...`);
      const instance = await fetchInstance(id);
      allInstances.push(instance);
    } catch (err) {
      console.warn(`  Failed to fetch instance ${id}: ${err}`);
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'instances.json'),
    JSON.stringify(allInstances, null, 2),
  );
  console.log(`Wrote ${allInstances.length} instances`);

  // 3. Fetch all encounters
  const allEncounters = [];
  for (const instance of allInstances) {
    console.log(`\nFetching encounters for ${instance.name}...`);
    for (const ref of instance.encounters) {
      try {
        console.log(`  Fetching encounter: ${ref.name}...`);
        const encounter = await fetchEncounter(ref.id, instance.slug);
        allEncounters.push(encounter);
      } catch (err) {
        console.warn(`  Failed to fetch encounter ${ref.id}: ${err}`);
      }
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'encounters.json'),
    JSON.stringify(allEncounters, null, 2),
  );
  console.log(`\nWrote ${allEncounters.length} encounters`);
  console.log('\nDone! Data written to src/data/generated/');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
