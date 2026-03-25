'use client';

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Brain, CheckCircle2, Database, Fingerprint, Layers3, RotateCcw, Sparkles, Tag } from 'lucide-react';
import { useCategories } from '@/hooks/use-queries';
import {
  addPreferredKeyword,
  createAnonymousProfile,
  getAnonymousProfile,
  PROFILE_UPDATED_EVENT,
  removePreferredKeyword,
  saveAnonymousProfile,
  setPreferredCategories,
  type AnonymousProfile,
} from '@/lib/personalization/anonymous-profile';

function subscribeProfile(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener('focus', handler);
  window.addEventListener(PROFILE_UPDATED_EVENT, handler);

  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('focus', handler);
    window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
  };
}

function getProfileSnapshot() {
  return getAnonymousProfile() ?? createAnonymousProfile();
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] bg-[var(--surface-soft)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">{label}</p>
      <p className="mt-2 text-base font-bold text-[#111827]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#6b7280]">{description}</p>
    </div>
  );
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 top-5 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3 rounded-[22px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(17,24,39,0.22)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/14">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <span>{message}</span>
      </div>
    </div>
  );
}

export default function MyPage() {
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const { data: categories = [] } = useCategories();
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordError, setKeywordError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const profileId = useMemo(() => profile.id, [profile.id]);
  const preferredCategorySet = useMemo(
    () => new Set(profile.preferredCategorySlugs),
    [profile.preferredCategorySlugs],
  );
  const categoryNameMap = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.name])),
    [categories],
  );
  const selectedCategoryNames = useMemo(
    () => profile.preferredCategorySlugs.map((slug) => categoryNameMap.get(slug) ?? slug),
    [categoryNameMap, profile.preferredCategorySlugs],
  );
  const topBehaviorCategories = useMemo(
    () =>
      Object.entries(profile.categoryScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([slug, score]) => ({
          slug,
          score,
          name: categoryNameMap.get(slug) ?? slug,
        })),
    [categoryNameMap, profile.categoryScores],
  );
  const topBehaviorKeywords = useMemo(
    () =>
      Object.entries(profile.keywordScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [profile.keywordScores],
  );

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleCategoryToggle = (slug: string) => {
    const nextCategories = preferredCategorySet.has(slug)
      ? profile.preferredCategorySlugs.filter((item) => item !== slug)
      : [...profile.preferredCategorySlugs, slug];

    setPreferredCategories(nextCategories);
    setToastMessage('관심 카테고리를 저장했어요.');
  };

  const handleKeywordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKeyword = keywordInput.trim();

    if (!trimmedKeyword) {
      setKeywordError('키워드를 입력해 주세요.');
      return;
    }

    const added = addPreferredKeyword(trimmedKeyword);
    if (!added) {
      setKeywordError('키워드는 2글자 이상 입력해 주세요.');
      return;
    }

    setKeywordInput('');
    setKeywordError('');
    setToastMessage('관심 키워드를 저장했어요.');
  };

  const handleKeywordRemove = (keyword: string) => {
    removePreferredKeyword(keyword);
    setToastMessage('관심 키워드를 삭제했어요.');
  };

  const handleResetProfile = () => {
    const confirmed = window.confirm('관심 카테고리, 키워드, 읽기 기록을 모두 초기화할까요?');

    if (!confirmed) {
      return;
    }

    const nextProfile: AnonymousProfile = {
      ...createAnonymousProfile(),
      preferredCategorySlugs: [],
      preferredKeywords: [],
    };

    saveAnonymousProfile(nextProfile);
    setKeywordInput('');
    setKeywordError('');
    setToastMessage('개인화 기록을 초기화했어요.');
  };

  return (
    <>
      <Toast message={toastMessage} visible={Boolean(toastMessage)} />

      <div className="mx-auto w-full max-w-[760px] space-y-4">
        <section className="toss-card overflow-hidden">
          <div className="bg-[linear-gradient(145deg,#1b64da_0%,#3182f6_65%,#68a5ff_100%)] px-6 py-7 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/18">
                <Brain className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Anonymous Personalization</p>
                <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] text-white">
                  마이페이지 설정
                </h1>
              </div>
            </div>
          </div>

          <div className="section-pad grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Profile"
              value={profileId ? `anon:${profileId.slice(0, 8)}` : '생성 중'}
              description="로그인 없이 이 브라우저 안에서만 개인화 프로필을 관리합니다."
            />
            <StatCard
              label="Storage"
              value="localStorage 기반"
              description="브라우저 데이터를 지우면 관심사 설정과 읽기 기록도 함께 초기화됩니다."
            />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="toss-card section-pad">
            <div className="flex items-center gap-3">
              <Layers3 className="h-5 w-5 text-[var(--primary-strong)]" />
              <h2 className="text-lg font-bold text-[#111827]">관심 카테고리</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4b5563]">
              먼저 보고 싶은 주제를 직접 고르면 맞춤 뉴스 정렬에 바로 반영됩니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => {
                const selected = preferredCategorySet.has(category.slug);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryToggle(category.slug)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? 'bg-[var(--primary-strong)] text-white'
                        : 'bg-[var(--surface-soft)] text-[#4b5563] hover:bg-[#e8eef7]'
                    }`}
                    aria-pressed={selected}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </article>

          <article className="toss-card section-pad">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-[var(--primary-strong)]" />
              <h2 className="text-lg font-bold text-[#111827]">관심 키워드</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4b5563]">
              직접 입력한 키워드는 행동 기록과 별도로 보관되고, 관련 기사에 가중치를 더합니다.
            </p>
            <form onSubmit={handleKeywordSubmit} className="mt-4 flex gap-2">
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="예: 반도체, 생성형 AI"
                className="min-w-0 flex-1 rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[var(--primary-strong)]"
              />
              <button
                type="submit"
                className="rounded-[18px] bg-[var(--primary-strong)] px-4 py-3 text-sm font-semibold text-white"
              >
                추가
              </button>
            </form>
            {keywordError ? <p className="mt-2 text-xs text-[var(--danger)]">{keywordError}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.preferredKeywords.length > 0 ? (
                profile.preferredKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => handleKeywordRemove(keyword)}
                    className="rounded-full bg-[var(--surface-soft)] px-3 py-2 text-sm font-medium text-[#334155] transition hover:bg-[#e8eef7]"
                  >
                    #{keyword} 삭제
                  </button>
                ))
              ) : (
                <p className="text-sm text-[#8b95a1]">아직 설정한 키워드가 없습니다.</p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="toss-card section-pad">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[var(--primary-strong)]" />
              <h2 className="text-lg font-bold text-[#111827]">현재 반영 상태</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-6 text-[#4b5563]">
              <div>
                <p className="font-semibold text-[#111827]">직접 선택한 카테고리</p>
                <p className="mt-1">
                  {selectedCategoryNames.length > 0
                    ? selectedCategoryNames.join(', ')
                    : '아직 선택한 카테고리가 없습니다.'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111827]">직접 입력한 키워드</p>
                <p className="mt-1">
                  {profile.preferredKeywords.length > 0
                    ? profile.preferredKeywords.map((keyword) => `#${keyword}`).join(', ')
                    : '아직 입력한 키워드가 없습니다.'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111827]">최근 본 기사 수</p>
                <p className="mt-1">{profile.seenNewsIds.length}건</p>
              </div>
            </div>
          </article>

          <article className="toss-card section-pad">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5 text-[var(--primary-strong)]" />
              <h2 className="text-lg font-bold text-[#111827]">행동 기반 선호</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-6 text-[#4b5563]">
              <div>
                <p className="font-semibold text-[#111827]">카테고리 반응 상위</p>
                {topBehaviorCategories.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {topBehaviorCategories.map((item) => (
                      <li key={item.slug}>
                        {item.name} · {item.score}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">아직 읽기 행동이 충분하지 않습니다.</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-[#111827]">키워드 반응 상위</p>
                {topBehaviorKeywords.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {topBehaviorKeywords.map(([keyword, score]) => (
                      <li key={keyword}>
                        #{keyword} · {score}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">아직 기록된 키워드 반응이 없습니다.</p>
                )}
              </div>
            </div>
          </article>
        </section>

        <section className="toss-card section-pad">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-[var(--primary-strong)]" />
            <h2 className="text-lg font-bold text-[#111827]">개인화 관리</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#4b5563]">
            여기서 고른 관심 카테고리와 키워드는 읽기 기록과 함께 맞춤 뉴스 정렬에 반영됩니다.
          </p>
          <button
            type="button"
            onClick={handleResetProfile}
            className="mt-5 inline-flex items-center gap-2 rounded-[18px] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[#334155] transition hover:bg-[#e8eef7]"
          >
            <RotateCcw className="h-4 w-4" />
            개인화 기록 초기화
          </button>
        </section>
      </div>
    </>
  );
}
