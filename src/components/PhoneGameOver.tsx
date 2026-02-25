import React from 'react';
import { FoundWord, PlayerResult } from '../types';

interface Props {
  score: number;
  words: FoundWord[];
  allResults: PlayerResult[];
  currentPlayerId: string;
  isHost?: boolean;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  onGoHome: () => void;
}

const PhoneGameOver: React.FC<Props> = ({
  score, words, allResults, currentPlayerId, isHost, onPlayAgain, onBackToLobby, onGoHome,
}) => {
  const sorted = [...allResults].sort((a, b) => b.score - a.score);
  const isWinner = allResults.length > 1 && sorted[0]?.id === currentPlayerId;
  const sortedWords = [...words].sort((a, b) => b.score - a.score);

  return (
    <div className="phone-gameover">
      <div className="phone-go-header">
        <h1 className="game-title">Joggle</h1>
        {isWinner && <p className="phone-go-winner">🏆 You won!</p>}
        {!isWinner && allResults.length > 1 && (
          <p className="phone-go-subtitle">{sorted[0]?.avatar} {sorted[0]?.name} wins!</p>
        )}
      </div>

      {/* Score */}
      <div className="phone-go-score-card">
        <div className="phone-go-score-number">{score.toLocaleString()}</div>
        <div className="phone-go-score-label">pts · {words.length} words</div>
      </div>

      {/* Scoreboard (multiplayer) */}
      {allResults.length > 1 && (
        <div className="phone-go-scoreboard">
          {sorted.map((r, i) => (
            <div
              key={r.id}
              className={`phone-go-row ${r.id === currentPlayerId ? 'you' : ''}`}
            >
              <span className="phone-go-rank">#{i + 1}</span>
              <span className="phone-go-avatar">{r.avatar}</span>
              <span className="phone-go-name">{r.name}</span>
              <span className="phone-go-pts">{r.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Words found */}
      {sortedWords.length > 0 && (
        <div className="phone-go-words">
          <h3 className="phone-go-words-title">Your Words</h3>
          <div className="phone-go-words-list">
            {sortedWords.map((w) => (
              <span key={w.word} className="found-word-chip">
                {w.word} <small>+{w.score}</small>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="phone-go-buttons">
        {isHost && (
          <button className="btn-primary" onClick={onPlayAgain}>Play Again</button>
        )}
        <button className={isHost ? 'btn-secondary' : 'btn-primary'} onClick={onBackToLobby}>Back to Lobby</button>
        <button className="btn-secondary" onClick={onGoHome}>Home</button>
      </div>
    </div>
  );
};

export default PhoneGameOver;
