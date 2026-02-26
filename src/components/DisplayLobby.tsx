import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Player { id: string; name: string; avatar: string; isHost?: boolean }

interface Props {
  joinUrl: string;
  players: Player[];
}

const DisplayLobby: React.FC<Props> = ({ joinUrl, players }) => (
  <div className="display-lobby">
    <h1 className="display-title">Joggle</h1>

    <div className="display-lobby-body">
      {/* QR code — primary CTA */}
      <div className="display-qr-block">
        <p className="display-qr-label">Scan to join</p>
        <div className="display-qr-box">
          <QRCodeSVG
            value={joinUrl}
            size={320}
            bgColor="#f0f8ff"
            fgColor="#0d2748"
            level="H"
            includeMargin={true}
          />
        </div>
      </div>

      {/* Player list */}
      <div className="display-players-block">
        <h2 className="display-players-heading">
          {players.length === 0 ? 'Waiting for players…' : 'Party'}
        </h2>
        {players.length > 0 && (
          <ul className="display-player-list">
            {players.map((p) => (
              <li key={p.id} className="display-player-item">
                <span className="display-player-avatar">{p.avatar}</span>
                <span className="display-player-name">{p.name}</span>
                {p.isHost && <span className="display-host-badge">host</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

export default DisplayLobby;
