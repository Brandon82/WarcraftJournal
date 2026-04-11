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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiGet<T>(endpoint: string, retries = 3): Promise<T> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE}${endpoint}${separator}namespace=${NAMESPACE}&locale=${LOCALE}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 429) {
      const wait = Math.pow(2, attempt + 1) * 1000;
      console.warn(`    Rate limited, waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${url}`);
    }
    return response.json() as Promise<T>;
  }
  throw new Error(`API request failed after ${retries} retries: ${url}`);
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
  header_type?: number;
  sections?: BlizzardSection[];
  spell?: { id: number; name: string; key?: { href: string } };
  creature_display?: { id: number; key?: { href: string } };
}

// Blizzard in-game EJ section icon flags (from GetSectionIconFlags)
const HEADER_TYPE_MAP: Record<number, string> = {
  1: 'tank',
  2: 'dps',
  3: 'healer',
  4: 'heroic',
  5: 'mythic',
  6: 'deadly',
  7: 'important',
  8: 'interruptible',
  9: 'magic',
  10: 'curse',
  11: 'poison',
  12: 'disease',
  13: 'enrage',
};

// Icon flag bitmask values from JournalEncounterSection.IconFlags DB2 column
const ICON_FLAG_MAP: Record<number, string> = {
  1: 'tank',
  2: 'dps',
  4: 'healer',
  8: 'heroic',
  16: 'deadly',
  32: 'important',
  64: 'interruptible',
  128: 'magic',
  256: 'curse',
  512: 'poison',
  1024: 'disease',
  2048: 'enrage',
};

function iconFlagsToHeaderIcon(flags: number): string | undefined {
  // Return the most significant flag as the primary icon
  // Priority: heroic/mythic > deadly > important > dispel types > role indicators
  const priority = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 1, 2, 4];
  for (const bit of priority) {
    if (flags & bit) return ICON_FLAG_MAP[bit];
  }
  return undefined;
}

// Section metadata from wago.tools DB2 export
let sectionMetadata: Map<number, { iconFlags: number; difficultyMask: number }> = new Map();

async function fetchSectionMetadata(): Promise<void> {
  console.log('Fetching section metadata from wago.tools...');
  try {
    const response = await fetch('https://wago.tools/db2/JournalEncounterSection/csv');
    if (!response.ok) {
      console.warn(`  Warning: Could not fetch section metadata (${response.status}), difficulty filtering will be limited`);
      return;
    }
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const header = lines[0].split(',');
    const idIdx = header.indexOf('ID');
    const iconFlagsIdx = header.indexOf('IconFlags');
    const diffMaskIdx = header.indexOf('DifficultyMask');

    if (idIdx === -1 || iconFlagsIdx === -1 || diffMaskIdx === -1) {
      console.warn('  Warning: Unexpected CSV format from wago.tools');
      return;
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length <= Math.max(idIdx, iconFlagsIdx, diffMaskIdx)) continue;
      const id = parseInt(cols[idIdx], 10);
      const iconFlags = parseInt(cols[iconFlagsIdx], 10);
      const difficultyMask = parseInt(cols[diffMaskIdx], 10);
      if (!isNaN(id)) {
        sectionMetadata.set(id, { iconFlags: iconFlags || 0, difficultyMask });
      }
    }
    console.log(`  Loaded metadata for ${sectionMetadata.size} sections`);
  } catch (err) {
    console.warn(`  Warning: Failed to fetch section metadata: ${err}`);
  }
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

async function fetchSpellTooltip(spellId: number): Promise<{ description?: string; icon?: string } | undefined> {
  try {
    const response = await fetch(`https://nether.wowhead.com/tooltip/spell/${spellId}`);
    if (!response.ok) return undefined;
    const data = await response.json();
    const icon = data.icon
      ? `https://wow.zamimg.com/images/wow/icons/large/${data.icon}.jpg`
      : undefined;
    if (!data.tooltip) return icon ? { icon } : undefined;
    // Extract description: strip HTML, then take text after the header table
    const plain = (data.tooltip as string)
      .replace(/<table>.*?<\/table>/s, '') // Remove the first header table (name, range, cast time)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { description: plain || undefined, icon };
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
  if (section.spell?.id) {
    const tooltipResult = await fetchSpellTooltip(section.spell.id);
    if (!bodyText && tooltipResult?.description) bodyText = tooltipResult.description;
    if (!spellIcon && tooltipResult?.icon) spellIcon = tooltipResult.icon;
  }

  const children = [];
  if (section.sections) {
    for (const child of section.sections) {
      children.push(await processSection(child));
    }
  }

  // Resolve headerIcon and difficultyMask from wago.tools metadata or Blizzard header_type
  const meta = sectionMetadata.get(section.id);
  let headerIcon: string | undefined;
  let difficultyMask: number | undefined;

  if (meta) {
    if (meta.iconFlags) headerIcon = iconFlagsToHeaderIcon(meta.iconFlags);
    if (meta.difficultyMask !== -1) difficultyMask = meta.difficultyMask;
  }
  // Fallback to Blizzard API header_type if no wago data
  if (!headerIcon && section.header_type != null) {
    headerIcon = HEADER_TYPE_MAP[section.header_type];
  }

  return {
    id: section.id,
    title: section.title,
    ...(bodyText ? { bodyText } : {}),
    ...(difficultyMask != null ? { difficultyMask } : {}),
    ...(children.length > 0 ? { sections: children } : {}),
    ...(section.spell?.id ? { spellId: section.spell.id } : {}),
    ...(spellIcon ? { spellIcon } : {}),
    ...(section.creature_display?.id
      ? { creatureDisplayId: section.creature_display.id }
      : {}),
    ...(creatureDisplayMedia ? { creatureDisplayMedia } : {}),
    ...(headerIcon ? { headerIcon } : {}),
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

// Mapping of Blizzard journal instance ID → Wowhead zone info for zone spells (trash/NPC abilities).
// Zone IDs and slugs are from wowhead.com/zone=XXXXX/slug URLs.
const INSTANCE_TO_WOWHEAD_ZONE: Record<number, { id: number; slug: string }> = {
  // Midnight expansion dungeons
  1299: { id: 15808, slug: 'windrunner-spire' },
  1300: { id: 15829, slug: 'magisters-terrace' },
  1304: { id: 16091, slug: 'murder-row' },
  1309: { id: 16359, slug: 'the-blinding-vale' },
  1311: { id: 16368, slug: 'den-of-nalorakk' },
  // Extra M+ season dungeons
  278: { id: 4813, slug: 'pit-of-saron' },
  476: { id: 6988, slug: 'skyreach' },
  945: { id: 8910, slug: 'seat-of-the-triumvirate' },
  1201: { id: 14032, slug: 'algethar-academy' },
  1313: { id: 16425, slug: 'voidscar-arena' },
  1315: { id: 16395, slug: 'maisara-caverns' },
  1316: { id: 16573, slug: 'nexus-point-xenas' },
  // Midnight expansion raids
  1307: { id: 16340, slug: 'the-voidspire' },
  1308: { id: 16342, slug: 'isle-of-queldanas' },
  1314: { id: 16531, slug: 'the-dreamrift' },
};

interface WowheadNpc {
  id: number;
  name: string;
  classification: number;
  react: number[];
}

// Override NPCs that Wowhead doesn't tag for a zone yet.
// These are merged into the zone's NPC list before deduplication and ability fetching.
// If `spells` is provided, the Wowhead ability fetch is skipped for that NPC (icons/tooltips are still fetched).
// If `spells` is omitted, abilities are fetched from Wowhead as normal.
// classification: 1=elite, 2=rare-elite, 3=boss, 4=rare
// schools bitmask: 1=Physical, 2=Holy, 4=Fire, 8=Nature, 16=Frost, 32=Shadow, 64=Arcane
interface NpcOverride {
  id: number;
  name: string;
  classification: number;
  spells?: { id: number; name: string; schools: number }[];
}

const ZONE_NPC_OVERRIDES: Record<number, NpcOverride[]> = {
  // Windrunner Spire
  1299: [
    { id: 232119, name: 'Swiftshot Archer', classification: 1, spells: [
      { id: 1216419, name: 'Shoot', schools: 1 },
      { id: 1216454, name: 'Arrow Rain', schools: 1 },
    ] },
    { id: 232447, name: 'Spectral Axethrower', classification: 1, spells: [
      { id: 1217094, name: 'Throw Axe', schools: 1 },
    ] },
    { id: 232232, name: 'Zealous Reaver', classification: 1, spells: [
      { id: 473640, name: 'Fierce Slash', schools: 1 },
    ] },
    { id: 232171, name: 'Ardent Cutthroat', classification: 1, spells: [
      { id: 473794, name: 'Poison Blades', schools: 8 },
      { id: 473868, name: 'Shadowrive', schools: 1 },
    ] },
    { id: 232116, name: 'Windrunner Soldier', classification: 1, spells: [
      { id: 1216462, name: 'Precise Cut', schools: 1 },
    ] },
    { id: 232173, name: 'Fervent Apothecary', classification: 1, spells: [
      { id: 473647, name: 'Phial Toss', schools: 8 },
    ] },
    { id: 232070, name: 'Restless Steward', classification: 1, spells: [
      { id: 1216135, name: 'Spirit Bolt', schools: 32 },
      { id: 1216298, name: 'Soul Torment', schools: 32 },
    ] },
    { id: 258868, name: 'Haunting Grunt', classification: 1, spells: [
      { id: 467815, name: 'Intercepting Charge', schools: 1 },
    ] },
    { id: 232121, name: 'Phalanx Breaker', classification: 1, spells: [
      { id: 471648, name: 'Break Ranks', schools: 1 },
      { id: 471643, name: 'Interrupting Screech', schools: 1 },
    ] },
    { id: 232283, name: 'Loyal Worg', classification: 1, spells: [
      { id: 1253739, name: 'Shred Flesh', schools: 1 },
    ] },
    { id: 232067, name: 'Creeping Spindleweb', classification: 1, spells: [
      { id: 1216834, name: 'Acidic Demise', schools: 8 },
      { id: 1216822, name: 'Poison Spray', schools: 8 },
    ] },
    { id: 232147, name: 'Lingering Marauder', classification: 1, spells: [
      { id: 1216643, name: 'Gore Whirl', schools: 1 },
    ] },
    { id: 238049, name: 'Scouting Trapper', classification: 1, spells: [
      { id: 1219224, name: 'Freezing Trap', schools: 16 },
    ] },
    { id: 234061, name: 'Phantasmal Mystic', classification: 1, spells: [
      { id: 1216592, name: 'Chain Lightning', schools: 8 },
      { id: 1216459, name: 'Ephemeral Bloodlust', schools: 1 },
    ] },
    { id: 232063, name: 'Apex Lynx', classification: 1, spells: [
      { id: 1216985, name: 'Puncturing Bite', schools: 1 },
      { id: 1217010, name: 'Ferocious Pounce', schools: 1 },
    ] },
    { id: 232176, name: 'Flesh Behemoth', classification: 1, spells: [
      { id: 473776, name: 'Fetid Spew', schools: 8 },
      { id: 1277799, name: 'Brutal Chop', schools: 1 },
    ] },
    { id: 236894, name: 'Bloated Lasher', classification: 1, spells: [
      { id: 1216819, name: 'Fungal Bolt', schools: 8 },
      { id: 1216963, name: 'Spore Dispersal', schools: 8 },
    ] },
    { id: 232113, name: 'Spellguard Magus', classification: 1, spells: [
      { id: 1216250, name: 'Arcane Salvo', schools: 64 },
      { id: 1253683, name: "Spellguard's Protection", schools: 64 },
    ] },
    { id: 232175, name: 'Devoted Woebringer', classification: 1, spells: [
      { id: 473657, name: 'Shadow Bolt', schools: 32 },
      { id: 473668, name: 'Pulsing Shriek', schools: 32 },
    ] },
    { id: 232056, name: 'Territorial Dragonhawk', classification: 1, spells: [
      { id: 1216848, name: 'Fire Spit', schools: 4 },
      { id: 1216860, name: 'Bolstering Flames', schools: 4 },
    ] },
  ],
  // Nexus-point Xenas
  1316: [
    { id: 241644, name: 'Corewright Arcanist', classification: 1 },
    { id: 241642, name: 'Lingering Image', classification: 1 },
    { id: 248502, name: 'Null Sentinel', classification: 1 },
    { id: 254932, name: 'Radiant Swarm', classification: 1 },
    { id: 241647, name: 'Flux Engineer', classification: 1 },
    { id: 241660, name: 'Duskfright Herald', classification: 1 },
    { id: 241645, name: 'Hollowsoul Scrounger', classification: 1 },
    { id: 248706, name: 'Cursed Voidcaller', classification: 1 },
    { id: 254926, name: 'Lightwrought', classification: 1 },
    { id: 248373, name: 'Circuit Seer', classification: 1 },
    { id: 248708, name: 'Nexus Adept', classification: 1 },
  ],
};

async function fetchWowheadPage(url: string, retries = 5): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      const wait = Math.pow(2, attempt) * 5000;
      console.warn(`    Wowhead returned error, retrying in ${wait / 1000}s...`);
      await sleep(wait);
    }
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    if (response.status === 403 || response.status === 429) continue;
    if (!response.ok) {
      throw new Error(`Wowhead fetch failed: ${response.status} ${url}`);
    }
    return response.text();
  }
  throw new Error(`Wowhead fetch failed after ${retries} retries (403): ${url}`);
}

function extractListviewData(html: string, template: string, id: string): unknown[] {
  // Match: new Listview({template: 'npc', id: 'npcs', ... data: [...]})
  // The data array can be very large, so we use a greedy match up to the closing of the Listview
  const pattern = new RegExp(
    `new Listview\\(\\{[^}]*template:\\s*'${template}'[^}]*id:\\s*'${id}'[^]*?data:\\s*(\\[[\\s\\S]*?\\])\\s*\\}\\)`,
  );
  const match = html.match(pattern);
  if (!match?.[1]) return [];
  try {
    // Wowhead data arrays use JS object notation which may have trailing commas or unquoted keys
    // Use Function constructor to safely evaluate as JS (not JSON)
    const fn = new Function(`return ${match[1]}`);
    return fn() as unknown[];
  } catch {
    return [];
  }
}

interface WowheadSpell {
  id: number;
  name: string;
  schools: number;
}

async function fetchZoneNpcs(wowheadZoneId: number, wowheadZoneSlug: string): Promise<WowheadNpc[]> {
  // Use the /npcs subpage which is more reliable than the main zone page
  const html = await fetchWowheadPage(`https://www.wowhead.com/zone=${wowheadZoneId}/${wowheadZoneSlug}/npcs`);
  const data = extractListviewData(html, 'npc', 'npcs') as WowheadNpc[];
  return data.filter((npc) => npc.id && npc.name);
}

async function fetchNpcAbilities(npcId: number): Promise<WowheadSpell[]> {
  const html = await fetchWowheadPage(`https://www.wowhead.com/npc=${npcId}`);
  const data = extractListviewData(html, 'spell', 'abilities') as WowheadSpell[];
  return data.filter((spell) => spell.id && spell.name);
}

async function fetchZoneSpellsForInstance(
  instance: { id: number; slug: string },
) {
  const wowheadZone = INSTANCE_TO_WOWHEAD_ZONE[instance.id];
  if (!wowheadZone) return null;

  console.log(`\nFetching zone spells for ${instance.slug} (zone ${wowheadZone.id})...`);

  // Fetch all NPCs in the zone
  let npcs: WowheadNpc[];
  try {
    npcs = await fetchZoneNpcs(wowheadZone.id, wowheadZone.slug);
  } catch (err) {
    console.warn(`  Failed to fetch zone NPCs: ${err}`);
    return null;
  }
  console.log(`  Found ${npcs.length} NPCs in zone`);

  // NPCs that appear in zone data but aren't actual dungeon mobs (warlock pets, story NPCs, etc.)
  const IGNORED_NPC_NAMES = new Set(['Dreadstalker', 'Wild Imp', "Xal'atath"]);

  // Spells to exclude from all zone spell results (generic/irrelevant abilities)
  const BLACKLISTED_SPELL_IDS = new Set([209859, 228318, 240443]);

  // Filter: hostile/elite NPCs (bosses + trash), excluding rare-elites
  // classification: 0=normal, 1=elite, 2=rare-elite, 3=boss, 4=rare
  // react: [alliance, horde] — negative = hostile, missing = assume hostile for elites
  const filteredNpcs = npcs.filter((npc) => {
    if (npc.classification < 1) return false;
    if (npc.classification === 2) return false; // rare-elite — not standard dungeon trash
    if (IGNORED_NPC_NAMES.has(npc.name)) return false;
    // If react data exists, check hostility; if missing, assume hostile for elite+ mobs
    const isFriendly = npc.react && npc.react[0] > 0 && npc.react[1] > 0;
    return !isFriendly;
  });

  // Merge in override NPCs (skip hostility filter since they're manually curated)
  const overrides = ZONE_NPC_OVERRIDES[instance.id] ?? [];
  if (overrides.length > 0) {
    console.log(`  Adding ${overrides.length} override NPCs`);
  }
  const overrideNpcs: WowheadNpc[] = overrides.map((o) => ({
    id: o.id,
    name: o.name,
    classification: o.classification,
    react: [-1, -1],
  }));
  const allNpcs = [...filteredNpcs, ...overrideNpcs];

  // Deduplicate NPCs by name — Wowhead often lists multiple IDs for the same mob.
  // Keep the one with the highest classification, breaking ties by highest ID (newest).
  const npcByName = new Map<string, WowheadNpc>();
  for (const npc of allNpcs) {
    const existing = npcByName.get(npc.name);
    if (!existing || npc.classification > existing.classification || (npc.classification === existing.classification && npc.id > existing.id)) {
      npcByName.set(npc.name, npc);
    }
  }
  const dungeonNpcs = [...npcByName.values()];
  console.log(`  Filtered to ${dungeonNpcs.length} dungeon NPCs (from ${filteredNpcs.length} before dedup)`);

  // Build a map of override NPCs that have pre-populated spells
  const overrideSpellsByNpcId = new Map<number, NonNullable<NpcOverride['spells']>>();
  for (const o of overrides) {
    if (o.spells && o.spells.length > 0) {
      overrideSpellsByNpcId.set(o.id, o.spells);
    }
  }

  // Fetch abilities for each trash NPC
  const uniqueSpellIds = new Set<number>();
  const npcResults = [];

  for (const npc of dungeonNpcs) {
    // Use pre-populated spells from overrides if available, skip Wowhead fetch
    const prePopulated = overrideSpellsByNpcId.get(npc.id);
    if (prePopulated) {
      const spells = prePopulated
        .filter((s) => !BLACKLISTED_SPELL_IDS.has(s.id))
        .map((s) => {
          uniqueSpellIds.add(s.id);
          return { id: s.id, name: s.name, schools: s.schools };
        });
      if (spells.length === 0) continue;
      npcResults.push({
        id: npc.id,
        name: npc.name,
        classification: npc.classification,
        spells,
      });
      console.log(`    ${npc.name}: ${spells.length} abilities (override)`);
      continue;
    }

    await sleep(1000);
    try {
      const abilities = await fetchNpcAbilities(npc.id);
      if (abilities.length === 0) continue;

      // Deduplicate spells by name — Wowhead lists multiple ranks/versions of the same ability.
      // Keep the highest spell ID (newest version) for each name.
      const spellByName = new Map<string, WowheadSpell>();
      for (const a of abilities) {
        if (BLACKLISTED_SPELL_IDS.has(a.id)) continue;
        const existing = spellByName.get(a.name);
        if (!existing || a.id > existing.id) {
          spellByName.set(a.name, a);
        }
      }
      if (spellByName.size === 0) continue;
      const spells = [...spellByName.values()].map((a) => {
        uniqueSpellIds.add(a.id);
        return {
          id: a.id,
          name: a.name,
          schools: a.schools ?? 1,
        };
      });

      npcResults.push({
        id: npc.id,
        name: npc.name,
        classification: npc.classification,
        spells,
      });
      console.log(`    ${npc.name}: ${spells.length} abilities`);
    } catch (err) {
      console.warn(`    Failed to fetch abilities for ${npc.name}: ${err}`);
    }
  }

  // Fetch spell icons and tooltips for all unique spells
  console.log(`  Fetching icons/tooltips for ${uniqueSpellIds.size} unique spells...`);
  const spellIcons = new Map<number, string>();
  const spellDescriptions = new Map<number, string>();

  for (const spellId of uniqueSpellIds) {
    const [blizzIcon, tooltipResult] = await Promise.all([
      fetchMedia(`/data/wow/media/spell/${spellId}`),
      fetchSpellTooltip(spellId),
    ]);
    // Prefer Blizzard API icon, fall back to Wowhead icon
    const icon = blizzIcon ?? tooltipResult?.icon;
    if (icon) spellIcons.set(spellId, icon);
    if (tooltipResult?.description) spellDescriptions.set(spellId, tooltipResult.description);
  }

  // Enrich spells with icons and descriptions
  for (const npc of npcResults) {
    for (const spell of npc.spells) {
      const icon = spellIcons.get(spell.id);
      const desc = spellDescriptions.get(spell.id);
      if (icon) (spell as Record<string, unknown>).spellIcon = icon;
      if (desc) (spell as Record<string, unknown>).description = desc;
    }
  }

  return {
    instanceId: instance.id,
    instanceSlug: instance.slug,
    fetchedAt: new Date().toISOString(),
    npcs: npcResults,
  };
}

// Remove spells that appear in more than one instance — they're generic/shared abilities, not
// instance-specific trash mechanics. Mutates the array in place and drops NPCs left with no spells.
function removeSharedSpells(allZoneSpells: Record<string, unknown>[]): void {
  // Build a map of spellId → set of instanceSlugs it appears in
  const spellInstances = new Map<number, Set<string>>();
  for (const entry of allZoneSpells) {
    const slug = entry.instanceSlug as string;
    const npcs = entry.npcs as Array<{ spells: Array<{ id: number }> }>;
    for (const npc of npcs) {
      for (const spell of npc.spells) {
        let slugs = spellInstances.get(spell.id);
        if (!slugs) {
          slugs = new Set();
          spellInstances.set(spell.id, slugs);
        }
        slugs.add(slug);
      }
    }
  }

  const sharedSpellIds = new Set<number>();
  for (const [spellId, slugs] of spellInstances) {
    if (slugs.size > 1) sharedSpellIds.add(spellId);
  }

  if (sharedSpellIds.size > 0) {
    console.log(`\nRemoving ${sharedSpellIds.size} spells shared across multiple instances`);
  }

  // Filter out shared spells and remove NPCs left with no spells
  for (const entry of allZoneSpells) {
    const npcs = entry.npcs as Array<{ name: string; spells: Array<{ id: number }> }>;
    for (const npc of npcs) {
      npc.spells = npc.spells.filter((s) => !sharedSpellIds.has(s.id));
    }
    entry.npcs = npcs.filter((npc) => npc.spells.length > 0);
  }
}

const ZONE_SPELLS_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadCachedZoneSpells(): Map<string, { data: Record<string, unknown>; fresh: boolean }> {
  const cache = new Map<string, { data: Record<string, unknown>; fresh: boolean }>();
  const filePath = path.join(OUTPUT_DIR, 'zone-spells.json');
  if (!fs.existsSync(filePath)) return cache;
  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Array<Record<string, unknown>>;
    const now = Date.now();
    for (const entry of existing) {
      const slug = entry.instanceSlug as string;
      const fetchedAt = entry.fetchedAt as string | undefined;
      const age = fetchedAt ? now - new Date(fetchedAt).getTime() : Infinity;
      cache.set(slug, { data: entry, fresh: age < ZONE_SPELLS_MAX_AGE_MS });
    }
  } catch { /* ignore corrupt file */ }
  return cache;
}

// Extra instances to fetch beyond the expansion filter (e.g. legacy M+ season dungeons).
// These are fetched by name from the full journal-instance index.
const EXTRA_INSTANCE_NAMES = [
  'Pit of Saron',
  'Skyreach',
  'Seat of the Triumvirate',
  "Algeth'ar Academy",
];

// Parse CLI args: defaults to "midnight", use --all to fetch everything,
// or --expansion <name> to pick a specific one.
const EXPANSION_FILTER = (() => {
  if (process.argv.includes('--all')) return null;
  const idx = process.argv.indexOf('--expansion');
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1].toLowerCase() : 'midnight';
})();

async function fetchZoneSpellsFromDisk() {
  console.log('Fetching zone spells only (using existing generated data)...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const instancesPath = path.join(OUTPUT_DIR, 'instances.json');
  if (!fs.existsSync(instancesPath)) {
    console.error('Missing instances.json. Run fetch-data first without --only-zone-spells.');
    process.exit(1);
  }

  const allInstances = JSON.parse(fs.readFileSync(instancesPath, 'utf-8'));
  const cache = loadCachedZoneSpells();
  const forceRefresh = process.argv.includes('--force');

  const zoneSpellInstances = allInstances.filter(
    (i: Record<string, unknown>) => INSTANCE_TO_WOWHEAD_ZONE[i.id as number],
  );
  const allZoneSpells: Record<string, unknown>[] = [];

  for (const inst of zoneSpellInstances) {
    const cached = cache.get(inst.slug);
    if (cached?.fresh && !forceRefresh) {
      console.log(`\nSkipping ${inst.slug} (fetched ${cached.data.fetchedAt}, still fresh)`);
      allZoneSpells.push(cached.data);
      continue;
    }
    try {
      const result = await fetchZoneSpellsForInstance(inst);
      if (result && result.npcs.length > 0) {
        allZoneSpells.push(result);
      } else if (cached) {
        // Keep stale data if fetch returned nothing (e.g. Wowhead 403)
        console.log(`  Keeping stale cached data for ${inst.slug}`);
        allZoneSpells.push(cached.data);
      }
    } catch (err) {
      console.warn(`  Failed to fetch zone spells for ${inst.name}: ${err}`);
      if (cached) {
        console.log(`  Keeping stale cached data for ${inst.slug}`);
        allZoneSpells.push(cached.data);
      }
    }
  }

  removeSharedSpells(allZoneSpells);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'zone-spells.json'),
    JSON.stringify(allZoneSpells, null, 2),
  );
  console.log(`\nWrote zone spells for ${allZoneSpells.length} instances`);
  console.log('\nDone!');
}

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

  // --only-zone-spells: skip full Blizzard API fetch, but still authenticate for spell icons
  if (process.argv.includes('--only-zone-spells')) {
    await authenticate();
    return fetchZoneSpellsFromDisk();
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await authenticate();
  await fetchSectionMetadata();

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

  // 2. Resolve extra instance IDs from the journal-instance index
  const extraInstanceIds = new Set<number>();
  if (EXTRA_INSTANCE_NAMES.length > 0 && EXPANSION_FILTER) {
    console.log('\nResolving extra instances from journal index...');
    try {
      const instanceIndex = await apiGet<{
        instances: Array<{ id: number; name: string }>;
      }>('/data/wow/journal-instance/index');
      const nameSet = new Set(EXTRA_INSTANCE_NAMES.map((n) => n.toLowerCase()));
      for (const entry of instanceIndex.instances) {
        if (nameSet.has(entry.name.toLowerCase())) {
          console.log(`  Found extra instance: ${entry.name} (${entry.id})`);
          extraInstanceIds.add(entry.id);
        }
      }
    } catch (err) {
      console.warn(`  Failed to fetch instance index: ${err}`);
    }
  }

  // 3. Fetch instances
  const allInstances = [];
  const allInstanceIds = new Set<number>();
  for (const exp of expansions) {
    for (const ref of [...exp.raids, ...exp.dungeons]) {
      allInstanceIds.add(ref.id);
    }
  }
  for (const id of extraInstanceIds) {
    allInstanceIds.add(id);
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

  // 4. Fetch all encounters (deduplicated by ID in case the same encounter appears in multiple instances)
  const allEncounters = [];
  const seenEncounterIds = new Set<number>();
  for (const instance of allInstances) {
    console.log(`\nFetching encounters for ${instance.name}...`);
    for (const ref of instance.encounters) {
      if (seenEncounterIds.has(ref.id)) continue;
      seenEncounterIds.add(ref.id);
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

  // 5. Fetch zone spells (trash/NPC abilities from Wowhead)
  if (!process.argv.includes('--skip-zone-spells')) {
    const cache = loadCachedZoneSpells();
    const forceRefresh = process.argv.includes('--force');
    const zoneSpellInstances = allInstances.filter(
      (i: Record<string, unknown>) => INSTANCE_TO_WOWHEAD_ZONE[i.id as number],
    );
    const allZoneSpells: Record<string, unknown>[] = [];

    for (const inst of zoneSpellInstances) {
      const cached = cache.get(inst.slug);
      if (cached?.fresh && !forceRefresh) {
        console.log(`\nSkipping ${inst.slug} (fetched ${cached.data.fetchedAt}, still fresh)`);
        allZoneSpells.push(cached.data);
        continue;
      }
      try {
        const result = await fetchZoneSpellsForInstance(inst);
        if (result && result.npcs.length > 0) {
          allZoneSpells.push(result);
        } else if (cached) {
          console.log(`  Keeping stale cached data for ${inst.slug}`);
          allZoneSpells.push(cached.data);
        }
      } catch (err) {
        console.warn(`  Failed to fetch zone spells for ${inst.name}: ${err}`);
        if (cached) {
          console.log(`  Keeping stale cached data for ${inst.slug}`);
          allZoneSpells.push(cached.data);
        }
      }
    }

    removeSharedSpells(allZoneSpells);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'zone-spells.json'),
      JSON.stringify(allZoneSpells, null, 2),
    );
    console.log(`\nWrote zone spells for ${allZoneSpells.length} instances`);
  }

  console.log('\nDone! Data written to src/data/generated/');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
