import type { JournalSection } from './section';
import type { JournalItem } from './item';

export interface JournalEncounter {
  id: number;
  name: string;
  slug: string;
  description: string;
  instanceId: number;
  instanceSlug: string;
  creatures: JournalCreature[];
  sections: JournalSection[];
  items: JournalItem[];
  modes: JournalEncounterMode[];
}

export interface JournalCreature {
  id: number;
  name: string;
  creatureDisplayId?: number;
  creatureDisplayMedia?: string;
}

export interface JournalEncounterMode {
  name: string;
  type: string;
}
