export interface JournalSection {
  id: number;
  title: string;
  bodyText?: string;
  /** Bitmask: bit 0=LFR, bit 1=Normal, bit 2=Heroic, bit 3=Mythic. -1 = all. */
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
