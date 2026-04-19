// Local-storage persistence for imported MDT routes.
//
// We only store the raw MDT export string plus a bit of display metadata.
// On load the string is re-decoded through the normal pipeline, so the
// parsed structure never needs to survive a reload (it contains Maps and
// other things that don't serialize cleanly to JSON).

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'warcraftJournal.mdtRoutes.v1';
const MAX_ROUTES = 50;

export interface SavedMdtRoute {
  /** Unique id for React keys and delete operations. */
  id: string;
  /** Route title as authored in MDT (falls back to "Untitled route"). */
  name: string;
  /** Human-readable dungeon name, cached so the list can render without decoding. */
  dungeonName: string;
  /** The raw MDT export string that will be re-decoded on load. */
  mdtString: string;
  /** `Date.now()` timestamp of when the route was saved. */
  savedAt: number;
}

function readStorage(): SavedMdtRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive filter: drop anything missing the required fields.
    return parsed.filter(
      (r): r is SavedMdtRoute =>
        !!r &&
        typeof r.id === 'string' &&
        typeof r.name === 'string' &&
        typeof r.dungeonName === 'string' &&
        typeof r.mdtString === 'string' &&
        typeof r.savedAt === 'number',
    );
  } catch {
    return [];
  }
}

function writeStorage(routes: SavedMdtRoute[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  } catch (err) {
    // Quota exceeded or private mode — fail silently; in-memory state still works.
    console.warn('Failed to persist saved MDT routes:', err);
  }
}

export interface UseSavedMdtRoutes {
  routes: SavedMdtRoute[];
  /** Save a new route or update an existing one (dedup by mdtString). Returns the id. */
  save: (args: { name: string; dungeonName: string; mdtString: string }) => string;
  /** Delete a saved route by id. */
  remove: (id: string) => void;
  /** Delete every saved route. */
  clearAll: () => void;
  /** Rename a saved route. No-op if the id doesn't exist. */
  rename: (id: string, name: string) => void;
  /** True if a route matching this MDT string is already saved. */
  isSaved: (mdtString: string) => boolean;
}

export function useSavedMdtRoutes(): UseSavedMdtRoutes {
  const [routes, setRoutes] = useState<SavedMdtRoute[]>(() => readStorage());

  // Sync if another tab writes to storage.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRoutes(readStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback<UseSavedMdtRoutes['save']>(
    ({ name, dungeonName, mdtString }) => {
      let assignedId = '';
      setRoutes((prev) => {
        // If we already have this exact MDT string saved, update in place.
        const existingIdx = prev.findIndex((r) => r.mdtString === mdtString);
        if (existingIdx >= 0) {
          assignedId = prev[existingIdx].id;
          const next = prev.slice();
          next[existingIdx] = {
            ...next[existingIdx],
            name,
            dungeonName,
            savedAt: Date.now(),
          };
          writeStorage(next);
          return next;
        }
        assignedId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const entry: SavedMdtRoute = {
          id: assignedId,
          name,
          dungeonName,
          mdtString,
          savedAt: Date.now(),
        };
        const next = [entry, ...prev].slice(0, MAX_ROUTES);
        writeStorage(next);
        return next;
      });
      return assignedId;
    },
    [],
  );

  const remove = useCallback<UseSavedMdtRoutes['remove']>((id) => {
    setRoutes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback<UseSavedMdtRoutes['clearAll']>(() => {
    setRoutes(() => {
      writeStorage([]);
      return [];
    });
  }, []);

  const rename = useCallback<UseSavedMdtRoutes['rename']>((id, name) => {
    setRoutes((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, name } : r));
      writeStorage(next);
      return next;
    });
  }, []);

  const isSaved = useCallback<UseSavedMdtRoutes['isSaved']>(
    (mdtString) => routes.some((r) => r.mdtString === mdtString),
    [routes],
  );

  return { routes, save, remove, clearAll, rename, isSaved };
}
