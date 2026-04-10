export enum Role {
  Tank = 'tank',
  Healer = 'healer',
  DPS = 'dps',
}

export enum Difficulty {
  LFR = 'lfr',
  Normal = 'normal',
  Heroic = 'heroic',
  Mythic = 'mythic',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.LFR]: 'LFR',
  [Difficulty.Normal]: 'Normal',
  [Difficulty.Heroic]: 'Heroic',
  [Difficulty.Mythic]: 'Mythic',
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.Tank]: 'Tank',
  [Role.Healer]: 'Healer',
  [Role.DPS]: 'Damage',
};

export interface KeyNamePair {
  key: string;
  name: string;
}

export interface IdNameRef {
  id: number;
  name: string;
}
