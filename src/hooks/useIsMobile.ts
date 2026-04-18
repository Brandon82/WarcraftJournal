import { useSyncExternalStore } from 'react';

const mql = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null;

function subscribe(cb: () => void) {
  mql?.addEventListener('change', cb);
  return () => mql?.removeEventListener('change', cb);
}

function getSnapshot() {
  return mql?.matches ?? false;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
