export type AnonymousProfile = {
  id: string;
  createdAt: string;
  updatedAt: string;
  categoryScores: Record<string, number>;
  keywordScores: Record<string, number>;
  seenNewsIds: string[];
  preferredCategorySlugs: string[];
  preferredKeywords: string[];
};

const STORAGE_KEY = 'my-news.anonymous-profile';
export const PROFILE_UPDATED_EVENT = 'my-news:profile-updated';
const MAX_PREFERRED_KEYWORDS = 12;

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
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
}

function normalizeKeyword(keyword: string) {
  return keyword
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9가-힣]/g, '');
}

function normalizeProfile(rawProfile: Partial<AnonymousProfile>): AnonymousProfile {
  const createdAt = rawProfile.createdAt || nowIso();

  return {
    id: rawProfile.id || createId(),
    createdAt,
    updatedAt: rawProfile.updatedAt || createdAt,
    categoryScores: rawProfile.categoryScores ?? {},
    keywordScores: rawProfile.keywordScores ?? {},
    seenNewsIds: Array.isArray(rawProfile.seenNewsIds) ? rawProfile.seenNewsIds.slice(0, 100) : [],
    preferredCategorySlugs: Array.isArray(rawProfile.preferredCategorySlugs)
      ? Array.from(new Set(rawProfile.preferredCategorySlugs.filter(Boolean)))
      : [],
    preferredKeywords: Array.isArray(rawProfile.preferredKeywords)
      ? Array.from(
          new Set(
            rawProfile.preferredKeywords
              .map((keyword) => normalizeKeyword(keyword))
              .filter((keyword) => keyword.length >= 2),
          ),
        ).slice(0, MAX_PREFERRED_KEYWORDS)
      : [],
  };
}

export function createAnonymousProfile(): AnonymousProfile {
  const profile = normalizeProfile({
    id: createId(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    categoryScores: {},
    keywordScores: {},
    seenNewsIds: [],
    preferredCategorySlugs: [],
    preferredKeywords: [],
  });

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
    cachedProfile = normalizeProfile(JSON.parse(raw) as Partial<AnonymousProfile>);
    return cachedProfile;
  } catch {
    cachedRawProfile = null;
    cachedProfile = null;
    return null;
  }
}

export function setPreferredCategories(categorySlugs: string[]) {
  const profile = getAnonymousProfile() ?? createAnonymousProfile();

  saveAnonymousProfile({
    ...profile,
    preferredCategorySlugs: Array.from(new Set(categorySlugs.filter(Boolean))),
  });
}

export function addPreferredKeyword(keyword: string) {
  const normalizedKeyword = normalizeKeyword(keyword);
  if (normalizedKeyword.length < 2) {
    return false;
  }

  const profile = getAnonymousProfile() ?? createAnonymousProfile();
  const nextKeywords = Array.from(new Set([...profile.preferredKeywords, normalizedKeyword])).slice(
    0,
    MAX_PREFERRED_KEYWORDS,
  );

  saveAnonymousProfile({
    ...profile,
    preferredKeywords: nextKeywords,
  });

  return true;
}

export function removePreferredKeyword(keyword: string) {
  const normalizedKeyword = normalizeKeyword(keyword);
  const profile = getAnonymousProfile() ?? createAnonymousProfile();

  saveAnonymousProfile({
    ...profile,
    preferredKeywords: profile.preferredKeywords.filter((item) => item !== normalizedKeyword),
  });
}
