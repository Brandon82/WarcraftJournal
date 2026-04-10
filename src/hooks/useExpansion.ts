import { expansionBySlug } from '../data';
import type { JournalExpansion } from '../types';

export function useExpansion(slug: string | undefined): JournalExpansion | undefined {
  if (!slug) return undefined;
  return expansionBySlug.get(slug);
}
