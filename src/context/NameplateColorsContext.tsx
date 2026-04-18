import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type NpcTier = 'boss' | 'miniboss' | 'elite' | 'trivial';

export const DEFAULT_NAMEPLATE_COLORS: Record<NpcTier, string> = {
  boss: '#9400D3',
  miniboss: '#EE82EE',
  elite: '#9B5059',
  trivial: '#F0D656',
};

export const NAMEPLATE_TIER_LABELS: Record<NpcTier, string> = {
  boss: 'Boss',
  miniboss: 'Miniboss',
  elite: 'Elite',
  trivial: 'Trivial',
};

export const NAMEPLATE_TIER_ORDER: NpcTier[] = ['boss', 'miniboss', 'elite', 'trivial'];

interface NameplateColorsContextValue {
  colors: Record<NpcTier, string>;
  setColor: (tier: NpcTier, hex: string) => void;
  resetColors: () => void;
}

const STORAGE_KEY = 'nameplate-colors';

const NameplateColorsContext = createContext<NameplateColorsContextValue>({
  colors: DEFAULT_NAMEPLATE_COLORS,
  setColor: () => {},
  resetColors: () => {},
});

function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function getInitialColors(): Record<NpcTier, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NAMEPLATE_COLORS;
    const parsed = JSON.parse(raw) as Partial<Record<NpcTier, string>>;
    const out = { ...DEFAULT_NAMEPLATE_COLORS };
    for (const tier of NAMEPLATE_TIER_ORDER) {
      out[tier] = sanitizeHex(parsed?.[tier], DEFAULT_NAMEPLATE_COLORS[tier]);
    }
    return out;
  } catch {
    return DEFAULT_NAMEPLATE_COLORS;
  }
}

export function NameplateColorsProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<Record<NpcTier, string>>(getInitialColors);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  const setColor = useCallback((tier: NpcTier, hex: string) => {
    const clean = sanitizeHex(hex, DEFAULT_NAMEPLATE_COLORS[tier]);
    setColors((prev) => (prev[tier] === clean ? prev : { ...prev, [tier]: clean }));
  }, []);

  const resetColors = useCallback(() => setColors(DEFAULT_NAMEPLATE_COLORS), []);

  const value = useMemo(() => ({ colors, setColor, resetColors }), [colors, setColor, resetColors]);
  return <NameplateColorsContext.Provider value={value}>{children}</NameplateColorsContext.Provider>;
}

export function useNameplateColors() {
  return useContext(NameplateColorsContext);
}
