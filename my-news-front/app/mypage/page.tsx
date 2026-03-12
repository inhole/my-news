'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, ChevronRight, LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useLogout } from '@/hooks/use-queries';

export default function MyPage() {
  const router = useRouter();
  const logout = useLogout();
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken')),
  );

  const handleLogout = async () => {
    await logout.mutateAsync();
    setIsLoggedIn(false);
    router.push('/login');
  };

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4">
      <section className="toss-card overflow-hidden">
        <div className="bg-[linear-gradient(145deg,#1b64da_0%,#3182f6_65%,#68a5ff_100%)] px-6 py-7 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/18">
              <UserRound className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Account</p>
              <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em]">
                {isLoggedIn ? '로그인된 계정' : '게스트 사용자'}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
          <div className="rounded-[24px] bg-[var(--surface-soft)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">Status</p>
            <p className="mt-2 text-lg font-bold text-[#111827]">{isLoggedIn ? '인증 완료' : '로그인 필요'}</p>
          </div>
          <div className="rounded-[24px] bg-[var(--surface-soft)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">Security</p>
            <div className="mt-2 flex items-center gap-2 text-lg font-bold text-[#111827]">
              <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
              <span>토큰 기반 세션</span>
            </div>
          </div>
        </div>
      </section>

      <section className="toss-card overflow-hidden">
        <Link
          href="/bookmarks"
          className="item-inner-pad flex items-center justify-between border-b border-[var(--line)] transition hover:bg-[var(--surface-soft)]"
        >
          <div className="flex items-center gap-3">
            <Bookmark className="h-5 w-5 text-[var(--primary-strong)]" />
            <div>
              <p className="text-sm font-semibold text-[#111827]">북마크 기사</p>
              <p className="text-xs text-[#8b95a1]">저장한 기사를 관리합니다.</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
        </Link>

        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="item-inner-pad flex w-full items-center justify-between text-left transition hover:bg-[var(--surface-soft)]"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-[#374151]" />
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  {logout.isPending ? '로그아웃 중' : '로그아웃'}
                </p>
                <p className="text-xs text-[#8b95a1]">현재 기기에서 세션을 종료합니다.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
          </button>
        ) : (
          <Link
            href="/login"
            className="item-inner-pad flex items-center justify-between transition hover:bg-[var(--surface-soft)]"
          >
            <div className="flex items-center gap-3">
              <LogIn className="h-5 w-5 text-[#374151]" />
              <div>
                <p className="text-sm font-semibold text-[#111827]">로그인</p>
                <p className="text-xs text-[#8b95a1]">북마크와 개인화 기능을 사용합니다.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
          </Link>
        )}
      </section>
    </div>
  );
}
