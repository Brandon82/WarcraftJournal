import { useEffect } from 'react';

interface Bindings {
  /** Number of pulls available; 1-9 keys map to pulls 1..min(9,n). */
  pullCount: number;
  onSelectPull: (pullIndex: number) => void;
  onAddPull: () => void;
  onDeleteActivePull: () => void;
  onUndo: () => void;
  onRedo: () => void;
  /** When false, the hook installs no listener (used to disable in viewer
   *  mode or while no route is loaded). */
  enabled: boolean;
}

/** Keyboard shortcuts for the route builder. Skips events that originate from
 *  editable elements so the user can still type in the title input or import
 *  textarea without firing route mutations. */
export function useMdtKeybindings({
  pullCount,
  onSelectPull,
  onAddPull,
  onDeleteActivePull,
  onUndo,
  onRedo,
  enabled,
}: Bindings) {
  useEffect(() => {
    if (!enabled) return;

    function handle(e: KeyboardEvent) {
      // Ignore when the user is typing into an input/textarea/contenteditable.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (target.isContentEditable) return;
      }

      // Undo/redo. Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) = redo.
      const cmd = e.ctrlKey || e.metaKey;
      if (cmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (cmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
        return;
      }

      if (cmd || e.altKey) return;

      // Pull selection: 1..9.
      if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key);
        if (idx <= pullCount) {
          e.preventDefault();
          onSelectPull(idx);
        }
        return;
      }

      // 'n' = new pull. Lowercase only — uppercase N is left alone for the
      // browser's "new window" or Vim users.
      if (e.key === 'n') {
        e.preventDefault();
        onAddPull();
        return;
      }

      // Delete / Backspace = remove active pull.
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteActivePull();
        return;
      }
    }

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled, pullCount, onSelectPull, onAddPull, onDeleteActivePull, onUndo, onRedo]);
}
