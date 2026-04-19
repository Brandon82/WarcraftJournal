/**
 * Builds src/data/generated/warcraftlogs-runs.json: up to the top 5 Mythic+
 * runs from Warcraft Logs for each current-season dungeon, as report-link
 * metadata.
 *
 * Usage: npx tsx scripts/fetch-warcraftlogs-runs.ts
 *        npx tsx scripts/fetch-warcraftlogs-runs.ts --list-zones
 *
 * Requires a WCL v2 API client (create one at warcraftlogs.com/api/clients)
 * and these two env vars in .env:
 *
 *   WARCRAFTLOGS_CLIENT_ID=...
 *   WARCRAFTLOGS_CLIENT_SECRET=...
 *
 * Flow:
 *   1. POST /oauth/token (client_credentials) → access token
 *   2. GraphQL query worldData.zone(id: MPLUS_ZONE_ID).encounters → map
 *      encounter name → encounter id. Match to our internal dungeon slugs.
 *   3. For each encounter: GraphQL fightRankings(page: 1) → ranked runs with
 *      report code, fight id, key level, duration, team. The default metric
 *      is the right one for M+; passing `metric: execution` or `speed`
 *      returns an empty rankings array.
 *   4. Take top TOP_N_PER_DUNGEON per dungeon, write one JSON file.
 *
 * When the zone id is wrong or unknown, run with --list-zones to print every
 * zone the API exposes and pick the current M+ season one.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_FILE = resolve(__dirname, '../src/data/generated/warcraftlogs-runs.json');
const ENV_FILE = resolve(__dirname, '../.env');

// Midnight Season 1 M+ zone on WCL. Run `--list-zones` to discover the current
// id when the season rotates; WCL publishes a new zone per M+ season.
const MPLUS_ZONE_ID = 47;

// Names in WCL that don't match our instance slugs cleanly after slugifying.
// Add here if --list-zones reports an encounter whose slug doesn't line up.
const WCL_NAME_OVERRIDES: Record<string, string> = {
  // 'wcl encounter name' => 'our-slug'
  "nexus-point-xen-as": 'nexus-point-xenas',
};

// Our internal dungeon slugs for the current season. Mirrors
// src/data/currentSeason.ts. Duplicated here to avoid a cross-import into
// the Vite build tree from a build-time script.
const CURRENT_DUNGEON_SLUGS = [
  'magisters-terrace',
  'maisara-caverns',
  'nexus-point-xenas',
  'windrunner-spire',
  'pit-of-saron',
  'skyreach',
  'seat-of-the-triumvirate',
  'algethar-academy',
];

const TOP_N_PER_DUNGEON = 5;
const WCL_OAUTH_URL = 'https://www.warcraftlogs.com/oauth/token';
const WCL_GRAPHQL_URL = 'https://www.warcraftlogs.com/api/v2/client';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Minimal .env loader so the script can be run without dotenv. Only reads
// simple KEY=VALUE lines; ignores comments and export prefixes.
function loadEnv() {
  if (!existsSync(ENV_FILE)) return;
  const lines = readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function slugify(name: string): string {
  return name
    .replace(/['']/g, '')
    // Split camelCase boundaries so "DeathKnight" becomes "Death-Knight"
    // before the lowercase pass flattens everything to "death-knight".
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.WARCRAFTLOGS_CLIENT_ID;
  const clientSecret = process.env.WARCRAFTLOGS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing WARCRAFTLOGS_CLIENT_ID or WARCRAFTLOGS_CLIENT_SECRET. Create an API client at https://www.warcraftlogs.com/api/clients and add the values to .env.',
    );
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(WCL_OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OAuth failed: ${res.status} ${res.statusText} ${body}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('OAuth returned no access_token');
  return data.access_token;
}

async function gql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(WCL_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GraphQL ${res.status} ${res.statusText}: ${body}`);
  }
  const payload = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (payload.errors?.length) {
    throw new Error(`GraphQL errors: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  if (!payload.data) throw new Error('GraphQL returned no data');
  return payload.data;
}

interface WclEncounter {
  id: number;
  name: string;
}

interface WclZone {
  id: number;
  name: string;
  expansion?: { id: number; name: string };
  encounters?: WclEncounter[];
}

async function listZones(token: string): Promise<void> {
  const data = await gql<{ worldData: { zones: WclZone[] } }>(
    token,
    `query { worldData { zones { id name expansion { id name } } } }`,
  );
  const zones = data.worldData.zones ?? [];
  console.log(`${zones.length} zones:`);
  for (const z of zones) {
    const exp = z.expansion ? `  [${z.expansion.name}]` : '';
    console.log(`  ${String(z.id).padStart(4, ' ')}  ${z.name}${exp}`);
  }
}

async function fetchEncounters(token: string, zoneId: number): Promise<WclEncounter[]> {
  const data = await gql<{ worldData: { zone: WclZone | null } }>(
    token,
    `query($zoneId: Int!) { worldData { zone(id: $zoneId) { id name encounters { id name } } } }`,
    { zoneId },
  );
  if (!data.worldData.zone) {
    throw new Error(`Zone ${zoneId} not found. Run --list-zones to find the current M+ zone id.`);
  }
  console.log(`Zone "${data.worldData.zone.name}" has ${data.worldData.zone.encounters?.length ?? 0} encounters`);
  return data.worldData.zone.encounters ?? [];
}

interface WclTeamMember {
  name?: string;
  class?: string;
  spec?: string;
  role?: string;
}

interface WclRanking {
  report?: { code?: string; fightID?: number; startTime?: number };
  startTime?: number;
  duration?: number;
  score?: number;
  bracketData?: number;
  amount?: number;
  affixes?: Array<{ name?: string } | string | number>;
  deaths?: number;
  team?: WclTeamMember[];
}

interface WclFightRankings {
  rankings?: WclRanking[];
}

async function fetchRankings(token: string, encounterId: number): Promise<WclRanking[]> {
  // fightRankings returns a JSON scalar, so we just cast. Default metric
  // (no `metric` arg) is the one M+ encounters populate; `execution` and
  // `speed` both return empty rankings for keystone runs.
  const data = await gql<{ worldData: { encounter: { fightRankings: WclFightRankings | null } | null } }>(
    token,
    `query($id: Int!) {
      worldData {
        encounter(id: $id) {
          fightRankings(page: 1)
        }
      }
    }`,
    { id: encounterId },
  );
  const fr = data.worldData.encounter?.fightRankings;
  if (!fr) return [];
  return fr.rankings ?? [];
}

interface WarcraftLogsPlayer {
  name: string;
  className: string;
  classSlug: string;
  specName: string;
  role: 'tank' | 'healer' | 'dps';
  server: string;
  region: string;
}

interface WarcraftLogsRunEntry {
  source: {
    rank: number;
    reportCode: string;
    fightId: number;
    mythicLevel: number;
    durationMs: number;
    score: number;
    affixes: string[];
    startedAt: string;
    deaths: number;
    reportUrl: string;
    dungeonName: string;
    players: WarcraftLogsPlayer[];
  };
  scrapedAt: string;
}

function normalizeRole(role: string | undefined): 'tank' | 'healer' | 'dps' {
  const r = (role ?? '').toLowerCase();
  if (r === 'tank' || r === 'tanks') return 'tank';
  if (r === 'healer' || r === 'healers' || r === 'healing') return 'healer';
  return 'dps';
}

function buildEntry(
  ranking: WclRanking,
  rank: number,
  dungeonName: string,
): WarcraftLogsRunEntry | null {
  const reportCode = ranking.report?.code;
  const fightId = ranking.report?.fightID;
  if (!reportCode || fightId == null) return null;
  const durationMs = ranking.duration ?? 0;
  const mythicLevel = ranking.bracketData ?? 0;
  // Prefer the ranking's top-level startTime (keystone start) over
  // report.startTime (when the log recording began — often earlier).
  const startTime = ranking.startTime ?? ranking.report?.startTime;
  const startedAt = startTime ? new Date(startTime).toISOString() : '';
  // WCL returns affixes as numeric IDs; stringify so the JSON is stable
  // even though we don't display them yet.
  const affixes = (ranking.affixes ?? [])
    .map((a) => (typeof a === 'number' ? String(a) : typeof a === 'string' ? a : a?.name ?? ''))
    .filter((s): s is string => !!s);
  const players: WarcraftLogsPlayer[] = (ranking.team ?? []).map((p) => ({
    name: p.name ?? '',
    className: p.class ?? '',
    classSlug: slugify(p.class ?? ''),
    specName: p.spec ?? '',
    role: normalizeRole(p.role),
    server: '',
    region: '',
  }));
  return {
    source: {
      rank,
      reportCode,
      fightId,
      mythicLevel,
      durationMs,
      score: ranking.score ?? 0,
      affixes,
      startedAt,
      deaths: ranking.deaths ?? 0,
      reportUrl: `https://www.warcraftlogs.com/reports/${reportCode}#fight=${fightId}`,
      dungeonName,
      players,
    },
    scrapedAt: new Date().toISOString(),
  };
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const token = await getAccessToken();
  console.log('Got access token.');

  if (args.includes('--list-zones')) {
    await listZones(token);
    return;
  }

  const encounters = await fetchEncounters(token, MPLUS_ZONE_ID);

  // Match encounter names → our slugs, honoring any overrides.
  const encounterBySlug = new Map<string, WclEncounter>();
  for (const enc of encounters) {
    const rawSlug = slugify(enc.name);
    const slug = WCL_NAME_OVERRIDES[rawSlug] ?? rawSlug;
    encounterBySlug.set(slug, enc);
  }

  const results: Record<string, WarcraftLogsRunEntry[]> = {};
  let totalRuns = 0;
  const unmatched: string[] = [];

  for (const slug of CURRENT_DUNGEON_SLUGS) {
    const enc = encounterBySlug.get(slug);
    if (!enc) {
      unmatched.push(slug);
      continue;
    }
    console.log(`\n[${slug}] encounter=${enc.id} "${enc.name}"`);
    let rankings: WclRanking[];
    try {
      rankings = await fetchRankings(token, enc.id);
    } catch (err) {
      console.log(`  failed to fetch rankings: ${(err as Error).message}`);
      continue;
    }
    console.log(`  got ${rankings.length} rankings (want top ${TOP_N_PER_DUNGEON})`);
    const captured: WarcraftLogsRunEntry[] = [];
    for (const ranking of rankings) {
      if (captured.length >= TOP_N_PER_DUNGEON) break;
      const entry = buildEntry(ranking, captured.length + 1, enc.name);
      if (!entry) continue;
      captured.push(entry);
    }
    if (captured.length === 0) {
      console.log('  no usable runs with report metadata');
      continue;
    }
    console.log(`  captured ${captured.length}/${TOP_N_PER_DUNGEON}`);
    results[slug] = captured;
    totalRuns += captured.length;
  }

  if (unmatched.length) {
    console.log(
      `\nWARNING: ${unmatched.length} dungeon slug(s) had no matching encounter in zone ${MPLUS_ZONE_ID}: ${unmatched.join(', ')}`,
    );
    console.log('  Add entries to WCL_NAME_OVERRIDES if WCL\'s encounter name slugifies differently.');
  }

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(results, null, 2) + '\n');
  console.log(
    `\nDone. Wrote ${totalRuns} runs across ${Object.keys(results).length}/${CURRENT_DUNGEON_SLUGS.length} dungeons to ${OUT_FILE}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
