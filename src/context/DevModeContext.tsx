import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface DevModeContextValue {
  devMode: boolean;
  toggleDevMode: () => void;
}

const DevModeContext = createContext<DevModeContextValue>({
  devMode: false,
  toggleDevMode: () => {},
});

function getInitialDevMode(): boolean {
  return localStorage.getItem('devMode') === 'true';
}

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevMode] = useState<boolean>(getInitialDevMode);

  useEffect(() => {
    localStorage.setItem('devMode', String(devMode));
  }, [devMode]);

  const toggleDevMode = () => setDevMode((d) => !d);

  return (
    <DevModeContext.Provider value={{ devMode, toggleDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  return useContext(DevModeContext);
}
