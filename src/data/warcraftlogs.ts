const WARCRAFTLOGS_BASE = 'https://www.warcraftlogs.com/zone/rankings';

/**
 * Maps instance slugs to WarcraftLogs ranking URLs.
 * Zone 46 = VS / DR / MQD raid tier.
 * Zone 47 = Mythic+ Season 1.
 */
const warcraftLogsUrls: Record<string, string> = {
  // Raids (Zone 46: VS / DR / MQD)
  'the-voidspire': `${WARCRAFTLOGS_BASE}/46`,
  'the-dreamrift': `${WARCRAFTLOGS_BASE}/46`,
  'march-on-queldanas': `${WARCRAFTLOGS_BASE}/46`,

  // M+ Dungeons (Zone 47: Mythic+ Season 1)
  'magisters-terrace': `${WARCRAFTLOGS_BASE}/47?boss=12811`,
  'maisara-caverns': `${WARCRAFTLOGS_BASE}/47?boss=12874`,
  'nexus-point-xenas': `${WARCRAFTLOGS_BASE}/47?boss=12915`,
  'windrunner-spire': `${WARCRAFTLOGS_BASE}/47?boss=12805`,
  'pit-of-saron': `${WARCRAFTLOGS_BASE}/47?boss=10658`,
  'seat-of-the-triumvirate': `${WARCRAFTLOGS_BASE}/47?boss=361753`,
  'skyreach': `${WARCRAFTLOGS_BASE}/47?boss=61209`,
  'algethar-academy': `${WARCRAFTLOGS_BASE}/47?boss=112526`,
};

export function getWarcraftLogsUrl(instanceSlug: string): string | undefined {
  return warcraftLogsUrls[instanceSlug];
}
