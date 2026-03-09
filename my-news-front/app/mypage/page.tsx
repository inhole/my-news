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
    <div className="space-y-5 px-5 py-5">
      <section className="rounded-[28px] border border-[#ddd6cd] bg-[#fbfaf7] p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef1f6] text-[#2f3947]">
            <UserRound className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#8f96a1]">마이페이지</p>
            <h1 className="text-[1.8rem] font-black tracking-[-0.05em] text-[#2f3947]">
              {isLoggedIn ? '로그인된 계정' : '게스트 사용자'}
            </h1>
          </div>
        </div>

        <p className="text-base leading-7 text-[#65707d]">
          {isLoggedIn
            ? '저장한 기사와 관심 뉴스를 이곳에서 빠르게 관리할 수 있습니다.'
            : '로그인하면 북마크와 개인화된 뉴스 기능을 바로 사용할 수 있습니다.'}
        </p>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#ddd6cd] bg-[#fbfaf7] shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <Link
          href="/bookmarks"
          className="flex items-center justify-between border-b border-[#ebe5dc] px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <Bookmark className="h-5 w-5 text-[#ef7d2a]" />
            <span className="text-base font-semibold text-[#2f3947]">저장한 기사</span>
          </div>
          <ChevronRight className="h-5 w-5 text-[#b0b7c1]" />
        </Link>

        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-[#2f3947]" />
              <span className="text-base font-semibold text-[#2f3947]">
                {logout.isPending ? '로그아웃 중' : '로그아웃'}
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-[#b0b7c1]" />
          </button>
        ) : (
          <Link href="/login" className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <LogIn className="h-5 w-5 text-[#2f3947]" />
              <span className="text-base font-semibold text-[#2f3947]">로그인</span>
            </div>
            <ChevronRight className="h-5 w-5 text-[#b0b7c1]" />
          </Link>
        )}
      </section>
    </div>
  );
}
