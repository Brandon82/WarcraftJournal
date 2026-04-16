import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { MdtPull, MdtSpawnMarker } from '../../lib/mdt/types';

interface Props {
  spawn: MdtSpawnMarker;
  pulls: MdtPull[];
  x: number;
  y: number;
  onClose: () => void;
  onMoveToPull: (pullIndex: number) => void;
  onRemove?: () => void;
}

/** Right-click context menu shown next to a spawn. Portaled to <body> so it
 *  isn't constrained by the map's overflow:hidden. Closes on outside click,
 *  Escape, scroll, or window resize. */
export default function SpawnContextMenu({
  spawn,
  pulls,
  x,
  y,
  onClose,
  onMoveToPull,
  onRemove,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(e: PointerEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // Constrain to viewport so the menu doesn't escape off-screen on edges.
  const left = Math.min(x, window.innerWidth - 200);
  const top = Math.min(y, window.innerHeight - 240);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 2000,
        minWidth: 180,
        background: 'rgba(20, 20, 24, 0.97)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
        padding: '6px 0',
        color: '#d4d4d8',
        fontSize: 12,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          padding: '4px 12px 6px',
          fontSize: 11,
          color: '#9ca3af',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 220,
        }}
      >
        {spawn.name}
      </div>

      {pulls.length === 0 ? (
        <div style={{ padding: '8px 12px', color: '#9ca3af' }}>No pulls yet.</div>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {pulls.map((pull) => {
            const inThis = spawn.pullIndex === pull.index;
            return (
              <button
                key={pull.index}
                type="button"
                role="menuitem"
                onClick={() => onMoveToPull(pull.index)}
                style={menuItemStyle(inThis)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(251, 191, 36, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: 9999,
                    background: pull.color ? `#${pull.color}` : '#6b7280',
                  }}
                />
                <span>Move to Pull {pull.index}</span>
                {inThis && <span style={{ marginLeft: 'auto', color: '#fbbf24' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {onRemove && spawn.pullIndex != null && (
        <>
          <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '4px 0' }} />
          <button
            type="button"
            role="menuitem"
            onClick={onRemove}
            style={menuItemStyle(false, '#fca5a5')}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220, 38, 38, 0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Remove from pull
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}

function menuItemStyle(active: boolean, color = '#d4d4d8'): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    color,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
  };
}
