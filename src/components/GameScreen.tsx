import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameBoard from './GameBoard';
import { generateBoard, pathToWord, scoreWord } from '../gameLogic';
import { isValidWordSync, loadWordSet } from '../dictionary';
import { FoundWord, GameSettings, DEFAULT_SETTINGS } from '../types';
import { Profile } from '../types';
import { saveProfile } from '../storage';
import { getSocket } from '../socket';

interface Props {
  seed: number;
  settings?: GameSettings;
  profile: Profile;
  roomId: string;
  isHost?: boolean;
  onGameOver: (score: number, words: FoundWord[]) => void;
  onBack: () => void;
  multiplayerMode?: boolean;
}

const GameScreen: React.FC<Props> = ({ seed, settings = DEFAULT_SETTINGS, profile, roomId, isHost = false, onGameOver, onBack, multiplayerMode = false }) => {
  const { boardSize, duration, minWordLength } = settings;
  const [board] = useState(() => generateBoard(seed, boardSize));
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<{ text: string; type: 'good' | 'bad'; key: number } | null>(null);
  const [dictionaryReady, setDictionaryReady] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [flashPath, setFlashPath] = useState<number[]>([]);
  const [dupePath, setDupePath] = useState<number[]>([]);
  const [shakePath, setShakePath] = useState<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const flashRef = useRef<NodeJS.Timeout | null>(null);
  const flashPathRef = useRef<NodeJS.Timeout | null>(null);
  const dupePathRef = useRef<NodeJS.Timeout | null>(null);
  const shakePathRef = useRef<NodeJS.Timeout | null>(null);
  const flashKeyRef = useRef(0);
  const gameOverCalledRef = useRef(false);

  useEffect(() => {
    loadWordSet().then(() => setDictionaryReady(true));
  }, []);

  useEffect(() => {
    if (!dictionaryReady || gameOver) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [dictionaryReady, gameOver]);

  useEffect(() => {
    if (gameOver && !gameOverCalledRef.current) {
      gameOverCalledRef.current = true;
      // Update profile stats
      const updated: Profile = {
        ...profile,
        gamesPlayed: profile.gamesPlayed + 1,
        highScore: Math.max(profile.highScore, score),
        totalScore: profile.totalScore + score,
      };
      saveProfile(updated);
      // Submit results to server so all players can see the post-game screen
      try {
        const s = getSocket();
        s.emit('submit-results', {
          roomId,
          result: { id: profile.id, name: profile.name, avatar: profile.avatar, score, words: foundWords },
        });
      } catch (_) {}
      setTimeout(() => onGameOver(score, foundWords), 600);
    }
  }, [gameOver, score, foundWords, onGameOver, profile, roomId]);

  useEffect(() => {
    const word = pathToWord(selectedPath, board, boardSize);
    setCurrentWord(word);
  }, [selectedPath, board, boardSize]);

  const showFlash = (text: string, type: 'good' | 'bad') => {
    flashKeyRef.current += 1;
    setFlash({ text, type, key: flashKeyRef.current });
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setFlash(null), 1200);
  };

  const handleWordSubmit = useCallback((path: number[]) => {
    if (gameOver || !dictionaryReady) return;
    const word = pathToWord(path, board, boardSize);
    if (word.length < minWordLength) {
      setSelectedPath([]);
      return;
    }
    const alreadyFound = foundWords.some((fw) => fw.word === word);
    if (alreadyFound) {
      setDupePath(path);
      if (dupePathRef.current) clearTimeout(dupePathRef.current);
      dupePathRef.current = setTimeout(() => setDupePath([]), 180);
      setSelectedPath([]);
      return;
    }
    const valid = isValidWordSync(word);
    if (valid) {
      const pts = scoreWord(word);
      const newWord: FoundWord = { word, path, score: pts };
      setFoundWords((prev) => [...prev, newWord]);
      setScore((s) => s + pts);
      showFlash(`+${pts} — ${word}`, 'good');
      // Briefly flash green, then revert to default
      setFlashPath(path);
      if (flashPathRef.current) clearTimeout(flashPathRef.current);
      flashPathRef.current = setTimeout(() => setFlashPath([]), 600);
    } else {
      // Shake all tiles of the invalid word
      setShakePath(path);
      if (shakePathRef.current) clearTimeout(shakePathRef.current);
      shakePathRef.current = setTimeout(() => setShakePath([]), 420);
    }
    // invalid words: no popup — just silently clear selection
    setSelectedPath([]);
  }, [board, foundWords, gameOver, dictionaryReady, boardSize, minWordLength]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const urgentTimer = timeLeft <= 10;

  const sortedFound = [...foundWords].sort((a, b) => b.score - a.score);

  if (!dictionaryReady) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🔤</div>
        <p>Loading dictionary...</p>
      </div>
    );
  }

  return (
    <div className="game-screen">
      <div className="game-header">
        {isHost && (
          <button className="back-btn" onClick={onBack} aria-label="Back">‹</button>
        )}
        <div className="score-display">
          <span className="score-label">Score</span>
          <span className="score-value">{score}</span>
        </div>
        <div className={`timer-display${urgentTimer ? ' timer-urgent' : ''}`}>
          <span className="timer-label">Time</span>
          <span className="timer-value">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="current-word-bar">
        {flash && flash.type === 'good' ? (
          <span key={flash.key} className="current-word found-word-flash">{flash.text}</span>
        ) : currentWord.length > 0 ? (
          <span className="current-word">{currentWord}</span>
        ) : (
          <span className="current-word-hint">Drag or tap letters to form a word</span>
        )}
      </div>

      <GameBoard
        board={board}
        selectedPath={selectedPath}
        foundWordPaths={flashPath.length > 0 ? [flashPath] : []}
        dupeFlashPath={dupePath}
        shakeFlashPath={shakePath}
        onPathChange={setSelectedPath}
        onWordSubmit={handleWordSubmit}
        disabled={gameOver}
        size={boardSize}
      />

      <div className="found-words-section">
        <h3>Found Words</h3>
        <div className="found-words-list">
          {sortedFound.map((fw, i) => (
            <span key={i} className="found-word-chip">
              {fw.word} <small>+{fw.score}</small>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
