import React, { useState } from 'react';
import { Profile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { saveProfile, setActiveProfileId } from '../storage';

const AVATARS = ['🦁','🐯','🐻','🦊','🐺','🐸','🦋','🦄','🐉','🦅','🐬','🐙','🦖','🦩','🐝','🦜'];

interface Props {
  onCreated: (profile: Profile) => void;
  onCancel?: () => void;
  title?: string;
}

const CreateProfile: React.FC<Props> = ({ onCreated, onCancel, title = 'Create Your Profile' }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    if (trimmed.length > 20) {
      setError('Name must be 20 characters or less.');
      return;
    }
    const profile: Profile = {
      id: uuidv4(),
      name: trimmed,
      avatar,
      createdAt: Date.now(),
      gamesPlayed: 0,
      highScore: 0,
      totalScore: 0,
    };
    saveProfile(profile);
    setActiveProfileId(profile.id);
    onCreated(profile);
  };

  return (
    <div className="create-profile-overlay">
      <div className="create-profile-card">
        <h2>{title}</h2>
        <p className="subtitle">Pick an avatar and choose a name to get started!</p>

        <div className="avatar-grid">
          {AVATARS.map((em) => (
            <button
              key={em}
              className={`avatar-btn${avatar === em ? ' selected' : ''}`}
              onClick={() => setAvatar(em)}
              aria-label={`Select avatar ${em}`}
            >
              {em}
            </button>
          ))}
        </div>

        <div className="selected-avatar-preview">{avatar}</div>

        <input
          className="name-input"
          type="text"
          placeholder="Your name..."
          value={name}
          maxLength={20}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
        {error && <p className="error-msg">{error}</p>}

        <div className="profile-actions">
          {onCancel && (
            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          )}
          <button className="btn-primary" onClick={handleCreate}>
            Let's Play! 🎮
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProfile;
