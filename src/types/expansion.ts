export interface JournalExpansion {
  id: number;
  name: string;
  slug: string;
  dungeons: JournalInstanceRef[];
  raids: JournalInstanceRef[];
}

export interface JournalInstanceRef {
  id: number;
  name: string;
  slug: string;
}
