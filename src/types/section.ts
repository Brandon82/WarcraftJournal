export interface JournalSection {
  id: number;
  title: string;
  bodyText?: string;
  /** Mode-index bitmask for difficulty filtering. Bits correspond to encounter modes array indices. */
  difficultyMask?: number;
  sections?: JournalSection[];
  spellId?: number;
  spellIcon?: string;
  creatureDisplayId?: number;
  creatureDisplayMedia?: string;
  headerIcons?: SectionHeaderIcon[];
}

export type SectionHeaderIcon =
  | 'tank'
  | 'healer'
  | 'dps'
  | 'magic'
  | 'curse'
  | 'poison'
  | 'disease'
  | 'enrage'
  | 'interruptible'
  | 'important'
  | 'deadly'
  | 'heroic'
  | 'mythic';
