import { zoneSpellsByInstanceSlug } from '../data';
import type { ZoneSpellData } from '../types';

export function useZoneSpells(instanceSlug: string | undefined): ZoneSpellData | undefined {
  if (!instanceSlug) return undefined;
  return zoneSpellsByInstanceSlug.get(instanceSlug);
}
