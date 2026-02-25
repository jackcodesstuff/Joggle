import React, { useState } from 'react';
import { Profile } from '../types';
import {
  getProfiles,
  saveProfile,
  deleteProfile,
  setActiveProfileId,
} from '../storage';
import CreateProfile from './CreateProfile';

const AVATARS = ['🦁','🐯','🐻','🦊','🐺','🐸','🦋','🦄','🐉','🦅','🐬','🐙','🦖','🦩','🐝','🦜'];

interface Props {
  currentProfile: Profile;
  onProfileChange: (profile: Profile) => void;
  onClose: () => void;
}

const Settings: React.FC<Props> = ({ currentProfile, onProfileChange, onClose }) => {
  const [profiles, setProfiles] = useState<Profile[]>(getProfiles());
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refreshProfiles = () => setProfiles(getProfiles());

  const switchProfile = (p: Profile) => {
    setActiveProfileId(p.id);
    onProfileChange(p);
  };

  const startEdit = (p: Profile) => {
    setEditingProfile(p);
    setEditName(p.name);
    setEditAvatar(p.avatar);
  };

  const saveEdit = () => {
    if (!editingProfile) return;
    const updated = { ...editingProfile, name: editName.trim() || editingProfile.name, avatar: editAvatar };
    saveProfile(updated);
    refreshProfiles();
    if (editingProfile.id === currentProfile.id) onProfileChange(updated);
    setEditingProfile(null);
  };

  const handleDelete = (id: string) => {
    if (profiles.length <= 1) return;
    deleteProfile(id);
    refreshProfiles();
    if (id === currentProfile.id) {
      const remaining = getProfiles();
      if (remaining.length > 0) {
        setActiveProfileId(remaining[0].id);
        onProfileChange(remaining[0]);
      }
    }
    setConfirmDelete(null);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <section className="settings-section">
          <h3>Profiles</h3>
          <p className="settings-hint">Tap a profile to switch, or edit/delete it.</p>

          <ul className="profiles-list">
            {profiles.map((p) => (
              <li key={p.id} className={`profile-row${p.id === currentProfile.id ? ' active-profile' : ''}`}>
                {editingProfile?.id === p.id ? (
                  <div className="edit-form">
                    <div className="avatar-grid small">
                      {AVATARS.map((em) => (
                        <button
                          key={em}
                          className={`avatar-btn${editAvatar === em ? ' selected' : ''}`}
                          onClick={() => setEditAvatar(em)}
                        >{em}</button>
                      ))}
                    </div>
                    <input
                      className="name-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={20}
                    />
                    <div className="edit-actions">
                      <button className="btn-primary small" onClick={saveEdit}>Save</button>
                      <button className="btn-secondary small" onClick={() => setEditingProfile(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button className="profile-select-btn" onClick={() => switchProfile(p)}>
                      <span className="profile-avatar-lg">{p.avatar}</span>
                      <div className="profile-info">
                        <span className="profile-nm">{p.name}</span>
                        <span className="profile-stats">
                          🏆 Best: {p.highScore.toLocaleString()} · 🎮 {p.gamesPlayed} games
                        </span>
                      </div>
                      {p.id === currentProfile.id && <span className="active-tag">Active</span>}
                    </button>
                    <div className="profile-actions-row">
                      <button className="icon-btn" onClick={() => startEdit(p)} title="Edit">✏️</button>
                      {profiles.length > 1 && (
                        confirmDelete === p.id ? (
                          <>
                            <button className="icon-btn danger" onClick={() => handleDelete(p.id)}>✓</button>
                            <button className="icon-btn" onClick={() => setConfirmDelete(null)}>✕</button>
                          </>
                        ) : (
                          <button className="icon-btn danger" onClick={() => setConfirmDelete(p.id)} title="Delete">🗑️</button>
                        )
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          <button className="btn-secondary" onClick={() => setShowCreate(true)}>
            + Add New Profile
          </button>
        </section>

        <section className="settings-section">
          <h3>About</h3>
          <p className="about-text">
            Joggle · v1.0<br />
            Form words from adjacent letters on the board. Longer words = more points!<br />
            Dictionary: ~275,000 English words
          </p>
        </section>
      </div>

      {showCreate && (
        <CreateProfile
          title="New Profile"
          onCreated={(profile) => {
            refreshProfiles();
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
};

export default Settings;
