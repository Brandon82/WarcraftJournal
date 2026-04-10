import { instanceBySlug } from '../data';
import type { JournalInstance } from '../types';

export function useInstance(slug: string | undefined): JournalInstance | undefined {
  if (!slug) return undefined;
  return instanceBySlug.get(slug);
}
