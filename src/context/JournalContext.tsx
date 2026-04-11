import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Difficulty } from '../types';

interface JournalContextValue {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const JournalContext = createContext<JournalContextValue | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const difficulty = (searchParams.get('difficulty') as Difficulty) || Difficulty.Mythic;
  const activeTab = searchParams.get('tab') || 'overview';

  const setDifficulty = useCallback(
    (d: Difficulty) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('difficulty', d);
        return next;
      });
    },
    [setSearchParams],
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      });
    },
    [setSearchParams],
  );

  return (
    <JournalContext.Provider value={{ difficulty, setDifficulty, activeTab, setActiveTab }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}
