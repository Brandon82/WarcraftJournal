export enum Role {
  Tank = 'tank',
  Healer = 'healer',
  DPS = 'dps',
}

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
