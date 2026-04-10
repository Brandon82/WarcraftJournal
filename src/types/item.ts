export type ItemQuality = 'POOR' | 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface JournalItem {
  id: number;
  name: string;
  quality: ItemQuality;
  iconUrl?: string;
  itemLevel?: number;
}

export const ITEM_QUALITY_COLORS: Record<ItemQuality, string> = {
  POOR: '#9d9d9d',
  COMMON: '#ffffff',
  UNCOMMON: '#1eff00',
  RARE: '#0070dd',
  EPIC: '#a335ee',
  LEGENDARY: '#ff8000',
};
