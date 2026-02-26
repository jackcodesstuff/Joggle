import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PlayerResult } from '../types';
import { generateBoard } from '../gameLogic';

interface Props {
  score: number;
  foundWords: { word: string; path: number[]; score: number }[];
  seed: number;
  boardSize: number;
  allResults: PlayerResult[];
  currentPlayerId: string;
  joinUrl?: string;  // when provided (display mode), shows corner QR for next game
  onPlayAgain: () => void;
}

type WordEntry = { word: string; path: number[]; score: number; foundBy: string[] };

const GameOver: React.FC<Props> = ({
  seed, boardSize, allResults, currentPlayerId, joinUrl, onPlayAgain,
}) => {
  const isDisplay = !!joinUrl;  // display (TV) mode when joinUrl is provided
  const board = useMemo(() => generateBoard(seed, boardSize), [seed, boardSize]);

  const allWordEntries = useMemo<WordEntry[]>(() => {
    const wordMap = new Map<string, { path: number[]; score: number; foundBy: string[] }>();
    for (const result of allResults) {
      for (const fw of result.words) {
        if (!wordMap.has(fw.word)) wordMap.set(fw.word, { path: fw.path, score: fw.score, foundBy: [] });
        wordMap.get(fw.word)!.foundBy.push(result.id);
      }
    }
    return Array.from(wordMap.entries())
      .map(([word, data]) => ({ word, ...data }))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
  }, [allResults]);

  // ── Animation state ──────────────────────────────────────────
  const [animWordIdx, setAnimWordIdx]       = useState(-1);
  const [animCellIdx, setAnimCellIdx]       = useState(-1);
  const [jumpingIds, setJumpingIds]         = useState<Set<string>>(new Set());
  const [animDone, setAnimDone]             = useState(false);
  const [revealedWords, setRevealedWords]   = useState<WordEntry[]>([]);
  const [displayScores, setDisplayScores]   = useState<Record<string, number>>(
    () => Object.fromEntries(allResults.map(r => [r.id, 0])),
  );

  useEffect(() => {
    if (allWordEntries.length === 0) { setAnimDone(true); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let delay = 200;

    for (let wi = 0; wi < allWordEntries.length; wi++) {
      const wi_ = wi;
      const entry = allWordEntries[wi];

      // Reset grid + show new word label immediately
      timers.push(setTimeout(() => {
        setAnimWordIdx(wi_);
        setAnimCellIdx(-1);
        setJumpingIds(new Set());
      }, delay));

      // Trace each cell (first fires at same `delay`)
      for (let ci = 0; ci < entry.path.length; ci++) {
        const ci_ = ci;
        timers.push(setTimeout(() => setAnimCellIdx(ci_), delay));
        delay += 140;  // 120ms per cell — readable pace
      }

      // Word done: add to panel + jump + increment scores
      timers.push(setTimeout(() => {
        const e = allWordEntries[wi_];
        setRevealedWords(prev => [...prev, e]);
        setJumpingIds(new Set(e.foundBy));
        setDisplayScores(prev => {
          const next = { ...prev };
          for (const id of e.foundBy) next[id] = (next[id] ?? 0) + e.score;
          return next;
        });
      }, delay));

      // Brief pause before next word starts
      delay += 120;

      // Clear jump in the background
      const clearAt = delay + 300;
      timers.push(setTimeout(() => setJumpingIds(new Set()), clearAt));
    }

    // Finish
    timers.push(setTimeout(() => {
      setAnimDone(true);
      setAnimWordIdx(-1);
      setAnimCellIdx(-1);
    }, delay + 350));

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentEntry = animWordIdx >= 0 ? allWordEntries[animWordIdx] : null;

  const litCells = useMemo(() => {
    if (!currentEntry || animCellIdx < 0) return new Set<number>();
    return new Set(currentEntry.path.slice(0, animCellIdx + 1));
  }, [currentEntry, animCellIdx]);

  const currentCell = (currentEntry && animCellIdx >= 0) ? currentEntry.path[animCellIdx] : -1;

  const sortedResults = useMemo(() => [...allResults].sort((a, b) => b.score - a.score), [allResults]);
  const winner = allResults.length > 1 ? sortedResults[0] : null;

  const panelWords = animDone ? allWordEntries : revealedWords;

  const handleSkip = () => {
    setAnimDone(true);
    setAnimWordIdx(-1);
    setAnimCellIdx(-1);
    setJumpingIds(new Set());
    setRevealedWords(allWordEntries);
    setDisplayScores(Object.fromEntries(allResults.map(r => [r.id, r.score])));
  };

  return (
    <div className={`go-screen${isDisplay ? ' go-screen--display' : ''}`}>
      {/* Corner QR for display screens */}
      {joinUrl && (
        <div className="go-corner-qr">
          <QRCodeSVG value={joinUrl} size={110} bgColor="#f0f8ff" fgColor="#0d2748" level="L" includeMargin />
        </div>
      )}

      {/* Header */}
      <div className="go-header">
        <h1 className="game-title">Joggle</h1>
        {winner && animDone && (
          <p className="go-winner-banner">{winner.avatar}&nbsp;{winner.name} wins! 🏆</p>
        )}
      </div>

      {/* Body: left grid col + right word col */}
      <div className="go-body">

        <div className="go-left-col">
          {/* Word label */}
          <div className="go-word-label-area">
            {currentEntry ? (
              <span key={currentEntry.word} className="go-word-label">{currentEntry.word}</span>
            ) : animDone ? (
              <span className="go-word-label-done">
                {allWordEntries.length === 0 ? 'No words found 😅' : '🎉 Nice game!'}
              </span>
            ) : (
              <span className="go-word-label-placeholder">Get ready…</span>
            )}
          </div>

          {/* Board */}
          <div className="go-grid-wrap">
            <div className="go-grid" style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}>
              {board.flat().map((letter, idx) => (
                <div
                  key={idx}
                  className={[
                    'go-cell',
                    litCells.has(idx)   ? 'lit'     : '',
                    idx === currentCell ? 'current' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>

          {/* Players */}
          <div className="go-players-row">
            {allResults.map(r => (
              <div key={r.id}
                className={['go-player-card', r.id === currentPlayerId ? 'self' : ''].filter(Boolean).join(' ')}
              >
                {winner && r.id === winner.id && allResults.length > 1 && animDone && (
                  <div className="go-crown">👑</div>
                )}
                <div className={['go-player-avatar', jumpingIds.has(r.id) ? 'jumping' : ''].filter(Boolean).join(' ')}>
                  {r.avatar}
                </div>
                <div className="go-player-name">{r.name}</div>
                <div className="go-player-score">{displayScores[r.id] ?? 0} pts</div>
              </div>
            ))}
          </div>

          {/* Skip button — display only, shown during animation */}
          {!animDone && (
            <button className="go-skip-btn" onClick={handleSkip}>Skip</button>
          )}
        </div>

      </div>
    </div>
  );
};

export default GameOver;