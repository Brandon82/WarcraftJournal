import { useRef, useState } from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import type { MdtPull } from '../../lib/mdt/types';

interface RouteBuilderControlsProps {
  pulls: MdtPull[];
  activePullIndex: number | null;
  totalCount: number;
  onSelectPull: (pullIndex: number) => void;
  onAddPull: () => void;
  onRemovePull: (pullIndex: number) => void;
  /** Called when the user drags a pull row to a new position. Both indices
   *  are 1-based pull numbers (matching MdtPull.index). */
  onReorderPull?: (fromPullIndex: number, toPullIndex: number) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

/** Pull sidebar used in builder mode. Mirrors the viewer's pull list but
 *  adds "Add pull", undo/redo, drag-to-reorder, and per-pull delete. The
 *  currently active pull is the assignment target for map clicks. */
export default function RouteBuilderControls({
  pulls,
  activePullIndex,
  totalCount,
  onSelectPull,
  onAddPull,
  onRemovePull,
  onReorderPull,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: RouteBuilderControlsProps) {
  const showHistoryControls = onUndo != null || onRedo != null;
  // Drag state: the pull index currently being dragged, and the index being
  // hovered over so we can render a thin drop-target line.
  const draggingRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  function handleDragStart(pullIndex: number, e: React.DragEvent<HTMLLIElement>) {
    if (!onReorderPull) return;
    draggingRef.current = pullIndex;
    setDraggingIndex(pullIndex);
    // Required to enable dragging in Firefox.
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(pullIndex));
  }

  function handleDragOver(pullIndex: number, e: React.DragEvent<HTMLLIElement>) {
    if (!onReorderPull) return;
    if (draggingRef.current == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== pullIndex) setDropTargetIndex(pullIndex);
  }

  function handleDragLeave() {
    setDropTargetIndex(null);
  }

  function handleDrop(pullIndex: number, e: React.DragEvent<HTMLLIElement>) {
    if (!onReorderPull) return;
    e.preventDefault();
    const from = draggingRef.current;
    draggingRef.current = null;
    setDraggingIndex(null);
    setDropTargetIndex(null);
    if (from == null || from === pullIndex) return;
    onReorderPull(from, pullIndex);
  }

  function handleDragEnd() {
    draggingRef.current = null;
    setDraggingIndex(null);
    setDropTargetIndex(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-wow-text-secondary m-0">
          Pulls
        </h4>
        <div className="flex items-center gap-1">
          {showHistoryControls && (
            <>
              <Tooltip title="Undo (Ctrl+Z)">
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={onUndo}
                  disabled={!canUndo}
                />
              </Tooltip>
              <Tooltip title="Redo (Ctrl+Shift+Z)">
                <Button
                  size="small"
                  icon={<RedoOutlined />}
                  onClick={onRedo}
                  disabled={!canRedo}
                />
              </Tooltip>
            </>
          )}
          <Button size="small" icon={<PlusOutlined />} onClick={onAddPull}>
            Add
          </Button>
        </div>
      </div>
      {pulls.length === 0 ? (
        <p className="text-sm text-wow-text-secondary">
          Add a pull to start assigning mobs.
        </p>
      ) : (
        <ul className="space-y-1 list-none p-0 m-0">
          {pulls.map((pull) => {
            const active = pull.index === activePullIndex;
            const pullColor = pull.color ? `#${pull.color}` : undefined;
            const percent = formatPercent(pull.forces, totalCount);
            const isDragging = draggingIndex === pull.index;
            const isDropTarget =
              draggingIndex != null &&
              draggingIndex !== pull.index &&
              dropTargetIndex === pull.index;
            return (
              <li
                key={pull.index}
                className={`relative group transition-opacity ${
                  isDragging ? 'opacity-40' : ''
                } ${isDropTarget ? 'mdt-pull-drop-target' : ''}`}
                draggable={onReorderPull != null}
                onDragStart={(e) => handleDragStart(pull.index, e)}
                onDragOver={(e) => handleDragOver(pull.index, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(pull.index, e)}
                onDragEnd={handleDragEnd}
              >
                <button
                  type="button"
                  onClick={() => onSelectPull(pull.index)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-2 pr-8 rounded-lg border transition-colors duration-150 ${
                    active
                      ? 'border-wow-gold-muted bg-wow-bg-elevated text-wow-gold'
                      : 'border-wow-border bg-wow-bg-surface text-wow-text hover:border-wow-gold-muted/60'
                  }`}
                >
                  {onReorderPull && (
                    <span
                      className="text-wow-text-dim opacity-50 group-hover:opacity-90 cursor-grab active:cursor-grabbing flex items-center"
                      aria-hidden
                      title="Drag to reorder"
                    >
                      <HolderOutlined />
                    </span>
                  )}
                  {pullColor && (
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pullColor }}
                    />
                  )}
                  <span className="font-semibold text-sm">Pull {pull.index}</span>
                  <span className="ml-auto text-xs text-wow-text-secondary font-mono">
                    {percent}
                  </span>
                </button>
                <Popconfirm
                  title={`Delete pull ${pull.index}?`}
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onRemovePull(pull.index)}
                >
                  <button
                    type="button"
                    aria-label={`Delete pull ${pull.index}`}
                    className="absolute top-1/2 -translate-y-1/2 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-wow-text-dim opacity-60 hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 focus:opacity-100 transition-opacity"
                  >
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatPercent(forces: number, totalCount: number): string {
  if (!totalCount) return '—';
  return `${((forces / totalCount) * 100).toFixed(2)}%`;
}
