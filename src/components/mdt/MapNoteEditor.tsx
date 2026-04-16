import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Initial text — empty string for a new note. */
  initialText: string;
  /** Screen coordinates (clientX/clientY) where the editor anchors. */
  x: number;
  y: number;
  onSave: (text: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

/** Floating editor for a single map note. Portaled to <body> so the map's
 *  overflow:hidden doesn't clip it. Save on Ctrl/Cmd+Enter, cancel on Esc,
 *  outside-click closes (saves if dirty, cancels if empty). */
export default function MapNoteEditor({
  initialText,
  x,
  y,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
    taRef.current?.select();
  }, []);

  useEffect(() => {
    function handlePointer(e: PointerEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      // Outside click: persist on dirty input, otherwise treat as cancel.
      const trimmed = text.trim();
      if (trimmed) onSave(trimmed);
      else onCancel();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [text, onSave, onCancel]);

  const left = Math.min(x, window.innerWidth - 280);
  const top = Math.min(y, window.innerHeight - 180);

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 2100,
        width: 260,
        background: 'rgba(20, 20, 24, 0.97)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
        padding: 10,
        color: '#d4d4d8',
      }}
    >
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const t = text.trim();
            if (t) onSave(t);
            else onCancel();
          }
        }}
        rows={3}
        placeholder="Note text…"
        style={{
          width: '100%',
          resize: 'vertical',
          background: 'rgba(10, 10, 12, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 6,
          color: '#fbbf24',
          padding: '6px 8px',
          fontSize: 12,
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 10, color: '#9ca3af' }}>
          <kbd style={kbdStyle}>{isMac() ? '⌘' : 'Ctrl'}+Enter</kbd> save · <kbd style={kbdStyle}>Esc</kbd> cancel
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{ ...btnStyle, color: '#fca5a5', borderColor: 'rgba(220,38,38,0.4)' }}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const t = text.trim();
              if (t) onSave(t);
              else onCancel();
            }}
            style={{ ...btnStyle, background: 'rgba(251, 191, 36, 0.18)', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  borderRadius: 6,
  fontSize: 11,
  color: '#d4d4d8',
  cursor: 'pointer',
};

const kbdStyle: React.CSSProperties = {
  padding: '1px 5px',
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 3,
  fontSize: 9,
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
};

function isMac(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
}
