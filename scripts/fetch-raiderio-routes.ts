/**
 * Builds src/data/generated/raiderio-routes.json: up to the top 5 timed
 * Mythic+ runs *with an attached route* for each dungeon in the current
 * season, as MDT import strings plus roster/run metadata.
 *
 * Usage: npx tsx scripts/fetch-raiderio-routes.ts
 *
 * Raider.IO's "View Route" feature embeds keystone.guru's route viewer and
 * keystone.guru exposes an XHR endpoint that returns the MDT export string
 * for a given route_key. So the scrape is just three chained HTTP calls:
 *
 *   1. GET raider.io/api/v1/mythic-plus/runs?... → ranked runs, each with a
 *      logged_run_id when an attached route exists, plus roster info.
 *   2. GET raider.io/api/mythic-plus/runs/<season>/<id>-<lvl>-<slug> →
 *      run details, which expose keystoneRun.logged_details.route_key and
 *      showing_route_authorized.
 *   3. GET keystone.guru/ajax/<route_key>/mdtExport → { mdt_string, warnings }.
 *
 * We validate each captured string with our own decoder and fall through to
 * the next ranked run on any failure, stopping once we have TOP_N_PER_DUNGEON.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeMdtString } from '../src/lib/mdt/decodeRoute';
import { parseMdtRoute } from '../src/lib/mdt/parseRoute';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_FILE = resolve(__dirname, '../src/data/generated/raiderio-routes.json');

const SEASON = 'season-mn-1';

// Our internal slug → raider.io slug. Most match; nexus-point-xenas differs.
const DUNGEONS: { ourSlug: string; rioSlug: string }[] = [
  { ourSlug: 'magisters-terrace', rioSlug: 'magisters-terrace' },
  { ourSlug: 'maisara-caverns', rioSlug: 'maisara-caverns' },
  { ourSlug: 'nexus-point-xenas', rioSlug: 'nexuspoint-xenas' },
  { ourSlug: 'windrunner-spire', rioSlug: 'windrunner-spire' },
  { ourSlug: 'pit-of-saron', rioSlug: 'pit-of-saron' },
  { ourSlug: 'skyreach', rioSlug: 'skyreach' },
  { ourSlug: 'seat-of-the-triumvirate', rioSlug: 'seat-of-the-triumvirate' },
  { ourSlug: 'algethar-academy', rioSlug: 'algethar-academy' },
];

// How many top-ranked runs to try before giving up on a dungeon.
const MAX_CANDIDATES_PER_DUNGEON = 20;

// How many valid MDT-backed runs to capture per dungeon.
const TOP_N_PER_DUNGEON = 5;

// Shared browser-ish headers so raider.io / keystone.guru don't 403 us.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface RioRosterEntry {
  character: {
    name: string;
    class: { name: string; slug: string };
    spec: { name: string; slug: string };
    realm: { name: string; slug: string };
    region: { name: string; slug: string; short_name: string };
    faction: string;
    path?: string;
  };
  role: string;
}

interface RioRunRanking {
  rank: number;
  score: number;
  run: {
    keystone_run_id: number;
    mythic_level: number;
    clear_time_ms: number;
    keystone_time_ms: number;
    completed_at: string;
    num_chests: number;
    time_remaining_ms: number;
    logged_run_id: number | null;
    dungeon: { slug: string; name: string };
    roster?: RioRosterEntry[];
    faction?: string;
  };
}

interface RaiderIOPlayer {
  name: string;
  className: string;
  classSlug: string;
  specName: string;
  specSlug: string;
  role: string;
  realm: string;
  region: string;
  profileUrl: string | null;
}

interface RaiderIORouteEntry {
  mdtString: string;
  source: {
    rank: number;
    keystoneRunId: number;
    loggedRunId: number;
    routeKey: string;
    mythicLevel: number;
    clearTimeMs: number;
    keystoneTimeMs: number;
    timeRemainingMs: number;
    numChests: number;
    completedAt: string;
    score: number;
    faction: string | null;
    rioSlug: string;
    dungeonName: string;
    runUrl: string;
    keystoneGuruUrl: string;
    players: RaiderIOPlayer[];
  };
  scrapedAt: string;
}

async function fetchJson<T>(url: string, extraHeaders: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...extraHeaders },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json() as Promise<T>;
}

async function fetchTopRuns(rioSlug: string): Promise<RioRunRanking[]> {
  const url = `https://raider.io/api/v1/mythic-plus/runs?season=${SEASON}&region=world&dungeon=${rioSlug}&affixes=all&page=0`;
  const body = await fetchJson<{ rankings?: RioRunRanking[] }>(url);
  return body.rankings ?? [];
}

interface RunDetail {
  keystoneRun: {
    logged_details?: {
      route_key?: string;
      showing_route_authorized?: boolean;
    };
  };
}

async function fetchRouteKey(
  rioSlug: string,
  keystoneRunId: number,
  mythicLevel: number,
): Promise<string | null> {
  // Run detail URL shape: /api/mythic-plus/runs/<season>/<id>-<lvl>-<slug>
  const url = `https://raider.io/api/mythic-plus/runs/${SEASON}/${keystoneRunId}-${mythicLevel}-${rioSlug}`;
  const data = await fetchJson<RunDetail>(url);
  const d = data.keystoneRun?.logged_details;
  if (!d?.route_key || d.showing_route_authorized !== true) return null;
  return d.route_key;
}

interface MdtExportResponse {
  mdt_string: string;
  warnings?: unknown[];
}

async function fetchMdtString(routeKey: string, rioSlug: string): Promise<string | null> {
  const url = `https://keystone.guru/ajax/${routeKey}/mdtExport`;
  try {
    const data = await fetchJson<MdtExportResponse>(url, {
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://keystone.guru/route/${rioSlug}/${routeKey}/${rioSlug}`,
    });
    return data.mdt_string || null;
  } catch (err) {
    console.log(`    keystone.guru fetch failed: ${(err as Error).message}`);
    return null;
  }
}

function validateMdtString(mdt: string): boolean {
  try {
    const raw = decodeMdtString(mdt);
    parseMdtRoute(raw);
    return true;
  } catch {
    return false;
  }
}

function extractPlayers(roster: RioRosterEntry[] | undefined): RaiderIOPlayer[] {
  if (!roster) return [];
  return roster.map((member) => {
    const c = member.character;
    const profileUrl = c.path ? `https://raider.io${c.path}` : null;
    return {
      name: c.name,
      className: c.class?.name ?? '',
      classSlug: c.class?.slug ?? '',
      specName: c.spec?.name ?? '',
      specSlug: c.spec?.slug ?? '',
      role: member.role,
      realm: c.realm?.name ?? '',
      region: c.region?.short_name ?? c.region?.slug ?? '',
      profileUrl,
    };
  });
}

async function scrapeDungeon(
  dungeon: { ourSlug: string; rioSlug: string },
): Promise<RaiderIORouteEntry[]> {
  console.log(`\n[${dungeon.ourSlug}]`);
  let rankings: RioRunRanking[];
  try {
    rankings = await fetchTopRuns(dungeon.rioSlug);
  } catch (err) {
    console.log(`  failed to fetch rankings: ${(err as Error).message}`);
    return [];
  }
  const candidates = rankings
    .filter((r) => r.run.logged_run_id != null && r.run.time_remaining_ms > 0)
    .slice(0, MAX_CANDIDATES_PER_DUNGEON);
  console.log(
    `  ${rankings.length} rankings, ${candidates.length} timed + logged candidates (want top ${TOP_N_PER_DUNGEON})`,
  );

  const captured: RaiderIORouteEntry[] = [];
  for (const ranking of candidates) {
    if (captured.length >= TOP_N_PER_DUNGEON) break;
    const { run } = ranking;
    console.log(`  rank ${ranking.rank}: +${run.mythic_level} run=${run.keystone_run_id}`);
    let routeKey: string | null = null;
    try {
      routeKey = await fetchRouteKey(dungeon.rioSlug, run.keystone_run_id, run.mythic_level);
    } catch (err) {
      console.log(`    run-detail fetch failed: ${(err as Error).message}`);
      continue;
    }
    if (!routeKey) {
      console.log('    (no authorized route_key, trying next)');
      continue;
    }
    console.log(`    route_key=${routeKey}`);
    const mdt = await fetchMdtString(routeKey, dungeon.rioSlug);
    if (!mdt) {
      console.log('    (no mdt_string returned)');
      continue;
    }
    if (!validateMdtString(mdt)) {
      console.log(`    (got ${mdt.length} chars but failed to decode, trying next)`);
      continue;
    }
    console.log(`    ✓ captured valid MDT string (${mdt.length} chars)`);
    captured.push({
      mdtString: mdt,
      source: {
        rank: ranking.rank,
        keystoneRunId: run.keystone_run_id,
        loggedRunId: run.logged_run_id!,
        routeKey,
        mythicLevel: run.mythic_level,
        clearTimeMs: run.clear_time_ms,
        keystoneTimeMs: run.keystone_time_ms,
        timeRemainingMs: run.time_remaining_ms,
        numChests: run.num_chests,
        completedAt: run.completed_at,
        score: ranking.score,
        faction: run.faction ?? null,
        rioSlug: dungeon.rioSlug,
        dungeonName: run.dungeon.name,
        runUrl: `https://raider.io/mythic-plus-runs/${SEASON}/${run.keystone_run_id}-${run.mythic_level}-${dungeon.rioSlug}`,
        keystoneGuruUrl: `https://keystone.guru/route/${dungeon.rioSlug}/${routeKey}/${dungeon.rioSlug}`,
        players: extractPlayers(run.roster),
      },
      scrapedAt: new Date().toISOString(),
    });
  }
  if (captured.length === 0) {
    console.log('  gave up — no candidate yielded a usable MDT string');
  } else if (captured.length < TOP_N_PER_DUNGEON) {
    console.log(
      `  captured ${captured.length}/${TOP_N_PER_DUNGEON} — ran out of candidates`,
    );
  } else {
    console.log(`  captured ${captured.length}/${TOP_N_PER_DUNGEON} ✓`);
  }
  return captured;
}

async function main() {
  console.log(`Fetching top raider.io routes for ${SEASON}`);
  console.log(`Output: ${OUT_FILE}`);

  const results: Record<string, RaiderIORouteEntry[]> = {};
  let totalRoutes = 0;
  for (const dungeon of DUNGEONS) {
    const entries = await scrapeDungeon(dungeon);
    if (entries.length > 0) {
      results[dungeon.ourSlug] = entries;
      totalRoutes += entries.length;
    }
  }

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(results, null, 2) + '\n');
  console.log(
    `\nDone. Wrote ${totalRoutes} routes across ${Object.keys(results).length}/${DUNGEONS.length} dungeons to ${OUT_FILE}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
