import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface LayoutContextValue {
  /** When true, the AppLayout's main content uses a wider container with
   *  reduced horizontal padding. Pages call `setWide(true)` only on screens
   *  that genuinely need the room (e.g. the MDT route editor with the map
   *  and pulls sidebar) and reset to false otherwise. */
  wide: boolean;
  setWide: (wide: boolean) => void;
  /** When true, the AppLayout hides its sticky top header. Used by the MDT
   *  dungeon map while in fullscreen so the overlay isn't interrupted. */
  hideHeader: boolean;
  setHideHeader: (hide: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [wide, setWide] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const value = useMemo(
    () => ({ wide, setWide, hideHeader, setHideHeader }),
    [wide, hideHeader],
  );
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used inside <LayoutProvider>');
  return ctx;
}
