'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Bookmark, LogIn, LogOut, Newspaper } from 'lucide-react';
import { useLogout } from '@/hooks/use-queries';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const logout = useLogout();

  // 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);
  }, [pathname]); // pathname이 변경될 때마다 체크

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <header className="relative z-50 bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden mb-4 md:mb-6">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-blue-600">
            My News
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                pathname === '/' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">홈</span>
            </Link>

            <Link
              href="/news"
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                pathname?.startsWith('/news') 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">뉴스</span>
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href="/bookmarks"
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/bookmarks' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">북마크</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  disabled={logout.isPending}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">
                    {logout.isPending ? '...' : '로그아웃'}
                  </span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  pathname === '/login' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">로그인</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
