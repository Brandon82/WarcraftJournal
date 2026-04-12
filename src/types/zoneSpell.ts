export interface ZoneNpc {
  id: number;
  name: string;
  classification: number; // 1=elite, 2=rare-elite
  spells: ZoneSpell[];
}

export interface ZoneSpell {
  id: number;
  name: string;
  schools: number; // bitmask: 1=Physical, 2=Holy, 4=Fire, 8=Nature, 16=Frost, 32=Shadow, 64=Arcane
  spellIcon?: string;
  description?: string;
  tags?: string[]; // mechanic tags: 'interruptible', 'magic', 'curse', 'disease', 'poison', 'enrage'
}

export interface ZoneSpellData {
  instanceId: number;
  instanceSlug: string;
  fetchedAt?: string; // ISO timestamp of when this data was fetched
  npcs: ZoneNpc[];
}
