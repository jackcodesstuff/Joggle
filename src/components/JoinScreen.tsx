import React, { useState } from 'react';
import { Profile } from '../types';
import { getProfiles, setActiveProfileId } from '../storage';
import CreateProfile from './CreateProfile';

interface Props {
  roomCode: string;       // first 6 chars of roomId
  onJoin: (profile: Profile) => void;
  onGoHome: () => void;
}

const JoinScreen: React.FC<Props> = ({ roomCode, onJoin, onGoHome }) => {
  const profiles = getProfiles();
  const [showCreate, setShowCreate] = useState(profiles.length === 0);
  const [showSwitcher, setShowSwitcher] = useState(false);

  // The "active" or first available profile
  const defaultProfile = profiles[0] ?? null;
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(defaultProfile);

  const handleJoin = () => {
    if (!selectedProfile) return;
    setActiveProfileId(selectedProfile.id);
    onJoin(selectedProfile);
  };

  const handleProfileCreated = (p: Profile) => {
    setShowCreate(false);
    setSelectedProfile(p);
  };

  const handleSwitchProfile = (p: Profile) => {
    setSelectedProfile(p);
    setShowSwitcher(false);
  };

  if (showCreate) {
    return (
      <CreateProfile
        title="Welcome to Joggle!"
        onCreated={handleProfileCreated}
        onCancel={profiles.length > 0 ? () => setShowCreate(false) : undefined}
      />
    );
  }

  return (
    <div className="join-screen">
      <div className="join-card">
        <h1 className="game-title">Joggle</h1>
        <p className="join-subtitle">You've been invited to play!</p>

        <div className="room-pill">Room: {roomCode.toUpperCase()}</div>

        {selectedProfile && !showSwitcher && (
          <>
            <div className="join-profile-preview">
              <div className="big-avatar">{selectedProfile.avatar}</div>
              <div className="join-name">{selectedProfile.name}</div>
              <div className="join-stats">
                🏆 Best: {selectedProfile.highScore.toLocaleString()} · 🎮 {selectedProfile.gamesPlayed} games
              </div>
            </div>

            <div className="join-actions">
              <button className="btn-primary big-btn" onClick={handleJoin}>
                ✅ Join as {selectedProfile.name}
              </button>

              {profiles.length > 1 && (
                <>
                  <div className="join-divider">or</div>
                  <button className="btn-secondary" onClick={() => setShowSwitcher(true)}>
                    Switch Profile
                  </button>
                </>
              )}

              <div className="join-divider">or</div>
              <button className="btn-secondary" onClick={() => setShowCreate(true)}>
                + Create New Profile
              </button>
            </div>
          </>
        )}

        {showSwitcher && (
          <div className="switcher-list">
            <h3 style={{ marginBottom: 12, color: 'var(--blue-dark)' }}>Choose a Profile</h3>
            {profiles.map((p) => (
              <button
                key={p.id}
                className="switcher-item"
                onClick={() => handleSwitchProfile(p)}
              >
                <span className="sw-avatar">{p.avatar}</span>
                <div className="sw-info">
                  <span className="sw-name">{p.name}</span>
                  <span className="sw-stats">Best: {p.highScore.toLocaleString()}</span>
                </div>
              </button>
            ))}
            <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => setShowSwitcher(false)}>
              Cancel
            </button>
          </div>
        )}

        <button
          className="btn-secondary"
          style={{ marginTop: 18, width: '100%' }}
          onClick={onGoHome}
        >
          🏠 Go to My Lobby Instead
        </button>
      </div>
    </div>
  );
};

export default JoinScreen;
