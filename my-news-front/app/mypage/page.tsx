'use client';

import { useMemo } from 'react';
import { Brain, Database, Fingerprint, Layers3, Sparkles } from 'lucide-react';
import {
  createAnonymousProfile,
  getAnonymousProfile,
} from '@/lib/personalization/anonymous-profile';

export default function MyPage() {
  const profileId = useMemo(() => {
    const profile = getAnonymousProfile() ?? createAnonymousProfile();
    return profile.id;
  }, []);

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4">
      <section className="toss-card overflow-hidden">
        <div className="bg-[linear-gradient(145deg,#1b64da_0%,#3182f6_65%,#68a5ff_100%)] px-6 py-7 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/18">
              <Brain className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Anonymous Personalization</p>
              <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em]">내 피드 설정</h1>
            </div>
          </div>
        </div>

        <div className="section-pad grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] bg-[var(--surface-soft)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">Profile</p>
            <p className="mt-2 text-base font-bold text-[#111827]">
              {profileId ? `anon:${profileId.slice(0, 8)}` : '생성 중'}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#6b7280]">
              로그인 없이 이 브라우저 안에서만 개인화 프로필을 유지합니다.
            </p>
          </div>

          <div className="rounded-[24px] bg-[var(--surface-soft)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">Storage</p>
            <p className="mt-2 text-base font-bold text-[#111827]">localStorage 기반</p>
            <p className="mt-2 text-xs leading-5 text-[#6b7280]">
              기기 변경이나 브라우저 초기화 시 개인화 이력은 함께 초기화됩니다.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="toss-card section-pad">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[var(--primary-strong)]" />
            <h2 className="text-lg font-bold text-[#111827]">추천 원칙</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4b5563]">
            <li>최근 본 기사와 같은 카테고리 가중치 상승</li>
            <li>클릭이 많은 주제와 출처를 익명 프로필에 누적</li>
            <li>이미 본 기사와 유사 기사 중복 노출 억제</li>
          </ul>
        </article>

        <article className="toss-card section-pad">
          <div className="flex items-center gap-3">
            <Layers3 className="h-5 w-5 text-[var(--primary-strong)]" />
            <h2 className="text-lg font-bold text-[#111827]">모듈 분해</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4b5563]">
            <li>기사 수집/정제</li>
            <li>익명 프로필 저장</li>
            <li>행동 신호 수집</li>
            <li>랭킹 계산과 피드 조립</li>
          </ul>
        </article>
      </section>

      <section className="toss-card section-pad">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-[var(--primary-strong)]" />
          <h2 className="text-lg font-bold text-[#111827]">현재 단계</h2>
        </div>
        <p className="mt-4 text-sm leading-7 text-[#4b5563]">
          지금 구조는 로그인과 관리자 기능을 제거하고, 익명 사용자 프로필을 중심으로 모듈을
          확장하기 쉽게 정리한 상태입니다. 상세 설계는 루트 문서와
          `docs/anonymous-personalization-architecture.md`에 기록했습니다.
        </p>
        <div className="mt-5 rounded-[24px] bg-[var(--surface-soft)] px-4 py-4 text-sm text-[#4b5563]">
          <div className="flex items-center gap-2 font-semibold text-[#111827]">
            <Fingerprint className="h-4 w-4 text-[var(--primary-strong)]" />
            <span>다음 구현 우선순위</span>
          </div>
          <p className="mt-2 leading-6">
            기사 클릭, 공유, 체류시간 같은 행동 신호를 익명 프로필에 적재하고 홈 피드 정렬에 반영합니다.
          </p>
        </div>
      </section>
    </div>
  );
}
