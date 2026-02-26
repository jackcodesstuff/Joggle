import React, { useState, useRef, useEffect } from 'react';
import { getNeighbors } from '../gameLogic';

interface Props {
  board: string[][];
  selectedPath: number[];
  foundWordPaths: number[][];
  dupeFlashPath?: number[];
  shakeFlashPath?: number[];
  onPathChange: (path: number[]) => void;
  onWordSubmit: (path: number[]) => void;
  disabled: boolean;
  size?: number;
}

const GameBoard: React.FC<Props> = ({
  board,
  selectedPath,
  foundWordPaths,
  dupeFlashPath = [],
  shakeFlashPath = [],
  onPathChange,
  onWordSubmit,
  disabled,
  size = 4,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pathRef = useRef<number[]>([]);
  const lastClickedRef = useRef<number | null>(null);

  // Track which cells are part of any found word
  const foundCellIndices = new Set<number>();
  foundWordPaths.forEach((p) => p.forEach((idx) => foundCellIndices.add(idx)));

  const selectedSet = new Set(selectedPath);
  const dupeSet = new Set(dupeFlashPath);
  const shakeSet = new Set(shakeFlashPath);

  const canExtendTo = (idx: number, currentPath: number[]): boolean => {
    if (currentPath.includes(idx)) return false;
    if (currentPath.length === 0) return true;
    const last = currentPath[currentPath.length - 1];
    return getNeighbors(last, size).includes(idx);
  };

  // ── Mouse events ──────────────────────────────────────────────────────────
  const handleMouseDown = (idx: number) => {
    if (disabled) return;
    setIsDragging(true);
    pathRef.current = [idx];
    onPathChange([idx]);
    lastClickedRef.current = idx;
  };

  // Board-level mousemove: only register a cell when the cursor crosses
  // past the halfway point (within 35% of cell size from center).
  const handleBoardMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || disabled) return;
    const x = e.clientX;
    const y = e.clientY;
    let closestIdx: number | null = null;
    let closestDist = Infinity;
    for (let i = 0; i < cellRefs.current.length; i++) {
      const cell = cellRefs.current[i];
      if (!cell) continue;
      const rect = cell.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const threshold = rect.width * 0.35; // must be > halfway into cell
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < threshold && dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    if (closestIdx === null) return;
    const idx = closestIdx;
    const current = pathRef.current;
    if (current.length >= 2 && current[current.length - 2] === idx) {
      pathRef.current = current.slice(0, -1);
      onPathChange([...pathRef.current]);
      return;
    }
    if (canExtendTo(idx, current)) {
      pathRef.current = [...current, idx];
      onPathChange([...pathRef.current]);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (pathRef.current.length >= 3) {
      onWordSubmit([...pathRef.current]);
    }
    pathRef.current = [];
    onPathChange([]);
  };

  // ── Touch events ──────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    pathRef.current = [idx];
    onPathChange([idx]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    let closestIdx: number | null = null;
    let closestDist = Infinity;
    for (let i = 0; i < cellRefs.current.length; i++) {
      const cell = cellRefs.current[i];
      if (!cell) continue;
      const rect = cell.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const threshold = rect.width * 0.35;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < threshold && dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    if (closestIdx === null) return;
    const idx = closestIdx;
    const current = pathRef.current;
    if (current.length >= 2 && current[current.length - 2] === idx) {
      pathRef.current = current.slice(0, -1);
      onPathChange([...pathRef.current]);
      return;
    }
    if (canExtendTo(idx, current)) {
      pathRef.current = [...current, idx];
      onPathChange([...pathRef.current]);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (pathRef.current.length >= 3) {
      onWordSubmit([...pathRef.current]);
    }
    pathRef.current = [];
    onPathChange([]);
  };

  // ── Click-tap mode (no drag): click last letter twice to submit ───────────
  const handleClick = (idx: number) => {
    if (disabled || isDragging) return;

    const current = pathRef.current;

    if (current.length === 0) {
      pathRef.current = [idx];
      onPathChange([idx]);
      lastClickedRef.current = idx;
      return;
    }

    // Tapping the same last cell again submits
    if (current[current.length - 1] === idx) {
      if (current.length >= 3) {
        onWordSubmit([...current]);
      }
      pathRef.current = [];
      onPathChange([]);
      lastClickedRef.current = null;
      return;
    }

    // Going back
    if (current.length >= 2 && current[current.length - 2] === idx) {
      pathRef.current = current.slice(0, -1);
      onPathChange([...pathRef.current]);
      lastClickedRef.current = idx;
      return;
    }

    if (canExtendTo(idx, current)) {
      pathRef.current = [...current, idx];
      onPathChange([...pathRef.current]);
      lastClickedRef.current = idx;
    }
  };

  // Global mouse-up
  useEffect(() => {
    const up = () => {
      if (isDragging) {
        setIsDragging(false);
        if (pathRef.current.length >= 3) {
          onWordSubmit([...pathRef.current]);
        }
        pathRef.current = [];
        onPathChange([]);
      }
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [isDragging, onWordSubmit, onPathChange]);

  const getCellClass = (idx: number): string => {
    let cls = 'cell';
    if (shakeSet.has(idx)) {
      cls += ' cell-shake';
    } else if (foundCellIndices.has(idx)) {
      cls += ' cell-found';
    } else if (dupeSet.has(idx)) {
      cls += ' cell-dupe';
    } else if (selectedSet.has(idx)) {
      cls += ' cell-selected';
    }
    if (selectedPath.length > 0 && selectedPath[selectedPath.length - 1] === idx && !shakeSet.has(idx)) {
      cls += ' cell-last';
    }
    return cls;
  };

  return (
    <div
      className="game-board"
      ref={boardRef}
      data-board-size={size}
      style={{ '--board-size': size } as React.CSSProperties}
      onMouseMove={handleBoardMouseMove}
      onMouseLeave={() => {
        if (isDragging) {
          setIsDragging(false);
          if (pathRef.current.length >= 3) onWordSubmit([...pathRef.current]);
          pathRef.current = [];
          onPathChange([]);
        }
      }}
    >
      {board.flat().map((letter, idx) => (
        <div
          key={idx}
          ref={(el) => { cellRefs.current[idx] = el; }}
          className={getCellClass(idx)}
          data-cell-index={idx}
          onMouseDown={() => handleMouseDown(idx)}
          onMouseUp={handleMouseUp}
          onTouchStart={(e) => handleTouchStart(e, idx)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => handleClick(idx)}
          role="button"
          aria-label={`Letter ${letter}`}
          tabIndex={0}
        >
          <span className="cell-letter">{letter}</span>
          {selectedPath.indexOf(idx) !== -1 && (
            <span className="cell-order">{selectedPath.indexOf(idx) + 1}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default GameBoard;
