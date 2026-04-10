import { encounterBySlug } from '../data';
import type { JournalEncounter } from '../types';

export function useEncounter(slug: string | undefined): JournalEncounter | undefined {
  if (!slug) return undefined;
  return encounterBySlug.get(slug);
}
