export type AnonymousProfile = {
  id: string;
  createdAt: string;
  updatedAt: string;
  categoryScores: Record<string, number>;
  keywordScores: Record<string, number>;
  seenNewsIds: string[];
};

const STORAGE_KEY = 'my-news.anonymous-profile';
let cachedRawProfile: string | null = null;
let cachedProfile: AnonymousProfile | null = null;

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `anon-${Date.now()}`;
}

export function saveAnonymousProfile(profile: AnonymousProfile) {
  if (typeof window === 'undefined') {
    return;
  }

  const serializedProfile = JSON.stringify({
    ...profile,
    updatedAt: nowIso(),
  } satisfies AnonymousProfile);

  cachedRawProfile = serializedProfile;
  cachedProfile = JSON.parse(serializedProfile) as AnonymousProfile;
  window.localStorage.setItem(STORAGE_KEY, serializedProfile);
}

export function createAnonymousProfile(): AnonymousProfile {
  const profile: AnonymousProfile = {
    id: createId(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    categoryScores: {},
    keywordScores: {},
    seenNewsIds: [],
  };

  saveAnonymousProfile(profile);
  return profile;
}

export function getAnonymousProfile(): AnonymousProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    cachedRawProfile = null;
    cachedProfile = null;
    return null;
  }

  if (raw === cachedRawProfile) {
    return cachedProfile;
  }

  try {
    cachedRawProfile = raw;
    cachedProfile = JSON.parse(raw) as AnonymousProfile;
    return cachedProfile;
  } catch {
    cachedRawProfile = null;
    cachedProfile = null;
    return null;
  }
}
