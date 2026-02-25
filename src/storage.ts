import { Profile } from './types';

const PROFILES_KEY = 'wordhunt_profiles';
const ACTIVE_PROFILE_KEY = 'wordhunt_active_profile';

export function getProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  const profiles = getProfiles();
  return profiles.find((p) => p.id === id) ?? null;
}

export function saveProfile(profile: Profile): void {
  const profiles = getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  saveProfiles(profiles);
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter((p) => p.id !== id);
  saveProfiles(profiles);
  if (getActiveProfileId() === id) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}
