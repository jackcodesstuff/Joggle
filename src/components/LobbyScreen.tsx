import React, { useState } from 'react';
import { GameSettings, DEFAULT_SETTINGS } from '../types';

interface Props {
  onPlay: (settings: GameSettings) => void;
  players: { id?: string; name: string; avatar: string; isHost?: boolean }[];
  profileName: string;
  profileAvatar: string;
  onOpenSettings: () => void;
}

const FLOAT_TILES = [
  { letter: 'J', top: '8%',  left: '4%',   delay: '0s',    dur: '5.2s', rot: -12 },
  { letter: 'O', top: '12%', left: '82%',  delay: '0.8s',  dur: '6.1s', rot: 8   },
  { letter: 'G', top: '70%', left: '3%',   delay: '1.5s',  dur: '4.8s', rot: 15  },
  { letter: 'G', top: '55%', left: '88%',  delay: '0.3s',  dur: '5.7s', rot: -9  },
  { letter: 'L', top: '85%', left: '15%',  delay: '2.1s',  dur: '6.4s', rot: 6   },
  { letter: 'E', top: '78%', left: '76%',  delay: '1.1s',  dur: '5.0s', rot: -14 },
  { letter: 'W', top: '32%', left: '1%',   delay: '0.6s',  dur: '7.0s', rot: 10  },
  { letter: 'R', top: '40%', left: '91%',  delay: '1.8s',  dur: '5.5s', rot: -7  },
  { letter: 'D', top: '92%', left: '85%',  delay: '2.5s',  dur: '6.8s', rot: 11  },
  { letter: 'A', top: '48%', left: '5%',   delay: '1.3s',  dur: '5.9s', rot: 18  },
  { letter: 'T', top: '22%', left: '93%',  delay: '2.8s',  dur: '6.2s', rot: -11 },
  { letter: 'N', top: '62%', left: '50%',  delay: '0.5s',  dur: '7.3s', rot: 7   },
  { letter: 'P', top: '88%', left: '48%',  delay: '1.9s',  dur: '5.4s', rot: -16 },
  { letter: 'M', top: '18%', left: '22%',  delay: '3.4s',  dur: '4.9s', rot: 13  },
  { letter: 'B', top: '75%', left: '35%',  delay: '0.9s',  dur: '6.6s', rot: -8  },
];

const LobbyScreen: React.FC<Props> = ({
  onPlay,
  players,
  profileName,
  profileAvatar,
  onOpenSettings,
}) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  function set<K extends keyof GameSettings>(key: K, val: GameSettings[K]) {
    setSettings((s) => ({ ...s, [key]: val }));
  }

  return (
    <div className="lobby-screen">
      {/* Floating background tiles */}
      <div className="lobby-floats" aria-hidden="true">
        {FLOAT_TILES.map((t, i) => (
          <div
            key={i}
            className="float-tile"
            style={{
              top: t.top,
              left: (t as any).left,
              right: (t as any).right,
              animationDelay: t.delay,
              animationDuration: t.dur,
              '--rot': `${t.rot}deg`,
            } as React.CSSProperties}
          >
            {t.letter}
          </div>
        ))}
      </div>
      {/* Header */}
      <div className="lobby-header">
        <h1 className="game-title">Joggle</h1>
        <button className="settings-btn" onClick={onOpenSettings} aria-label="Settings">
          ☰
        </button>
      </div>

      <div className="profile-badge">
        <span className="profile-avatar-sm">{profileAvatar}</span>
        <span className="profile-name-sm">{profileName}</span>
      </div>

      {/* QR code section removed — QR is shown on the display screen */}

      <div className="players-section">
        <h3>👥 Party</h3>
        <ul className="player-list">
          {players.map((p, i) => (
            <li key={p.id ?? i} className="player-item">
              <span>{p.avatar}</span>
              <span>{p.name}</span>
              {p.isHost && <span className="host-badge">host</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="game-settings-panel">
        <div className="gsp-row">
          <span className="gsp-label">Grid</span>
          <div className="gsp-pills">
            {([4, 5, 6] as const).map((n) => (
              <button
                key={n}
                className={`gsp-pill${settings.boardSize === n ? ' active' : ''}`}
                onClick={() => set('boardSize', n)}
              >
                {n}×{n}
              </button>
            ))}
          </div>
        </div>
        <div className="gsp-row">
          <span className="gsp-label">Time</span>
          <div className="gsp-pills">
            {([30, 60, 90, 120, 180] as const).map((s) => (
              <button
                key={s}
                className={`gsp-pill${settings.duration === s ? ' active' : ''}`}
                onClick={() => set('duration', s)}
              >
                {s === 30 ? '30 s' : s === 60 ? '1 min' : s === 90 ? '1½ min' : s === 120 ? '2 min' : '3 min'}
              </button>
            ))}
          </div>
        </div>
        <div className="gsp-row">
          <span className="gsp-label">Min letters</span>
          <div className="gsp-pills">
            {([3, 4, 5] as const).map((n) => (
              <button
                key={n}
                className={`gsp-pill${settings.minWordLength === n ? ' active' : ''}`}
                onClick={() => set('minWordLength', n)}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lobby-buttons">
        <button className="btn-primary big-btn" onClick={() => onPlay(settings)}>
          ▶ Play{players.length > 1 ? ' with Friends' : ''}
        </button>
      </div>

      <p className="lobby-footer">
        Players join from the display screen QR code.
      </p>
    </div>
  );
};

export default LobbyScreen;
