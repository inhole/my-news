export type AnonymousProfile = {
  id: string;
  createdAt: string;
  updatedAt: string;
  categoryScores: Record<string, number>;
  keywordScores: Record<string, number>;
  seenNewsIds: string[];
};

const STORAGE_KEY = 'my-news.anonymous-profile';

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

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...profile,
      updatedAt: nowIso(),
    } satisfies AnonymousProfile),
  );
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
    return null;
  }

  try {
    return JSON.parse(raw) as AnonymousProfile;
  } catch {
    return null;
  }
}
