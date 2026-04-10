export interface JournalSection {
  id: number;
  title: string;
  bodyText?: string;
  sections?: JournalSection[];
  spellId?: number;
  spellIcon?: string;
  creatureDisplayId?: number;
  creatureDisplayMedia?: string;
  headerIcon?: SectionHeaderIcon;
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
