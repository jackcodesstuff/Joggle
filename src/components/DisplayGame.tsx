import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateBoard } from '../gameLogic';
import { GameSettings } from '../types';

interface Props {
  seed: number;
  settings: GameSettings;
  players: { id: string; name: string; avatar: string }[];
  joinUrl: string;
}

const DisplayGame: React.FC<Props> = ({ seed, settings, players, joinUrl }) => {
  const board = generateBoard(seed, settings.boardSize);
  const flat = board.flat();
  const size = settings.boardSize;

  const [timeLeft, setTimeLeft] = useState<number>(settings.duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = String(timeLeft % 60).padStart(2, '0');
  const urgent = timeLeft <= 10;

  return (
    <div className="display-game">
      {/* Timer */}
      <div className={`display-timer ${urgent ? 'urgent' : ''}`}>
        {mins > 0 ? `${mins}:${secs}` : `0:${secs}`}
      </div>

      {/* Board */}
      <div
        className="display-board"
        style={{ '--display-board-size': size } as React.CSSProperties}
      >
        {flat.map((letter, idx) => (
          <div key={idx} className="display-cell">{letter}</div>
        ))}
      </div>

      {/* Small QR in corner for late joiners */}
      <div className="display-corner-qr">
        <QRCodeSVG
          value={joinUrl}
          size={110}
          bgColor="#f0f8ff"
          fgColor="#0d2748"
          level="L"
          includeMargin={true}
        />
      </div>
    </div>
  );
};

export default DisplayGame;
