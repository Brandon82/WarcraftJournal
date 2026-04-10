export type InstanceCategory = 'raid' | 'dungeon';

export interface JournalInstance {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: InstanceCategory;
  expansionId: number;
  backgroundImage?: string;
  encounters: JournalEncounterRef[];
  modes: JournalMode[];
}

export interface JournalEncounterRef {
  id: number;
  name: string;
  slug: string;
}

export interface JournalMode {
  name: string;
  type: string;
}
