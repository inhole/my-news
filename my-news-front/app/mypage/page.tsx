'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, ChevronRight, LogIn, LogOut, UserRound } from 'lucide-react';
import { useLogout } from '@/hooks/use-queries';

export default function MyPage() {
  const router = useRouter();
  const logout = useLogout();
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'))
  );

  const handleLogout = async () => {
    await logout.mutateAsync();
    setIsLoggedIn(false);
    router.push('/login');
  };

  return (
    <div className="mx-auto w-full max-w-[680px] space-y-4 py-1">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[var(--line)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-weak)]">
            <UserRound className="h-7 w-7 text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#6b7280]">마이페이지</p>
            <h1 className="text-xl font-bold text-[#111827]">{isLoggedIn ? '로그인된 계정' : '게스트 사용자'}</h1>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[var(--line)]">
        <Link
          href="/bookmarks"
          className="item-inner-pad flex items-center justify-between border-b border-[#f1f5f9] transition hover:bg-[#f8fafc]"
        >
          <div className="flex items-center gap-3">
            <Bookmark className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-sm font-semibold text-[#111827]">북마크 기사</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
        </Link>

        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="item-inner-pad flex w-full items-center justify-between text-left transition hover:bg-[#f8fafc]"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-[#374151]" />
              <span className="text-sm font-semibold text-[#111827]">
                {logout.isPending ? '로그아웃 중' : '로그아웃'}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
          </button>
        ) : (
          <Link href="/login" className="item-inner-pad flex items-center justify-between transition hover:bg-[#f8fafc]">
            <div className="flex items-center gap-3">
              <LogIn className="h-5 w-5 text-[#374151]" />
              <span className="text-sm font-semibold text-[#111827]">로그인</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
          </Link>
        )}
      </section>
    </div>
  );
}

