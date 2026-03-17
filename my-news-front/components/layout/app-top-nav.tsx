'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Brain, Ellipsis, Flame, Search, Sparkles, SunMedium } from 'lucide-react';
import { CategoryTabs } from '@/components/news/category-tabs';
import { useNewsDetail } from '@/hooks/use-queries';

type HomeTab = 'weather' | 'headline' | 'trending' | 'personalized';

const homeTabs: Array<{ id: HomeTab; label: string; icon: typeof SunMedium }> = [
  { id: 'weather', label: '날씨', icon: SunMedium },
  { id: 'headline', label: '헤드라인', icon: Sparkles },
  { id: 'trending', label: '실검', icon: Flame },
  { id: 'personalized', label: '맞춤 뉴스', icon: Brain },
];

function formatTodayLabel() {
  return new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function AppTopNav() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollTopRef = useRef(0);
  const tickingRef = useRef(false);
  const isHomeRoute = pathname === '/';
  const isNewsRoute = pathname === '/news' || pathname?.startsWith('/news/');
  const newsId = typeof params.id === 'string' ? params.id : '';
  const searchKeyword = searchParams.get('search') || '';
  const selectedHomeTab = (searchParams.get('tab') as HomeTab) || 'weather';
  const { data: detailNews } = useNewsDetail(isNewsRoute ? newsId : '');

  const selectedCategory = useMemo(() => {
    if (pathname === '/news') {
      return searchParams.get('category') || '';
    }

    if (pathname?.startsWith('/news/')) {
      return detailNews?.category.slug || '';
    }

    return '';
  }, [detailNews?.category.slug, pathname, searchParams]);

  useEffect(() => {
    const scrollContainer = document.getElementById('app-scroll-container');
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      if (tickingRef.current) {
        return;
      }

      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentScrollTop = scrollContainer.scrollTop;
        const previousScrollTop = lastScrollTopRef.current;

        if (currentScrollTop <= 16) {
          setVisible(true);
        } else if (currentScrollTop > previousScrollTop + 8) {
          setVisible(false);
          setIsMenuOpen(false);
        } else if (currentScrollTop < previousScrollTop - 8) {
          setVisible(true);
        }

        lastScrollTopRef.current = currentScrollTop;
        tickingRef.current = false;
      });
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateOffset = () => {
      const nextOffset =
        visible && headerRef.current ? `${headerRef.current.offsetHeight}px` : '0px';
      document.documentElement.style.setProperty('--app-top-nav-offset', nextOffset);
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);

    return () => {
      window.removeEventListener('resize', updateOffset);
      document.documentElement.style.setProperty('--app-top-nav-offset', '0px');
    };
  }, [visible, isHomeRoute, isNewsRoute, selectedCategory, selectedHomeTab]);

  const handleCategoryChange = (categorySlug: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (categorySlug) {
      nextParams.set('category', categorySlug);
    } else {
      nextParams.delete('category');
    }

    const nextQuery = nextParams.toString();
    router.push(nextQuery ? `/news?${nextQuery}` : '/news');
  };

  const handleHomeTabChange = (tab: HomeTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', tab);
    router.push(`/?${nextParams.toString()}`);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    const trimmed = searchInputRef.current?.value.trim() || '';

    if (trimmed) {
      nextParams.set('search', trimmed);
    }

    router.push(nextParams.toString() ? `/news?${nextParams.toString()}` : '/news');
    setIsMenuOpen(false);
  };

  return (
    <header
      ref={headerRef}
      className={`fixed left-0 right-0 top-0 z-50 transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="mx-auto w-full max-w-[980px] px-3 pt-3 sm:px-6">
        <div className="toss-card overflow-visible rounded-[30px]">
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                My News
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--text)]">{formatTodayLabel()}</p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[#374151] transition hover:bg-[#e9eef5]"
                aria-label="메뉴 보기"
              >
                <Ellipsis className="h-5 w-5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-14 w-[292px] rounded-[24px] bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-[var(--line)]">
                  <form onSubmit={handleSearchSubmit} className="space-y-2">
                    <label className="text-xs font-semibold text-[#6b7280]">뉴스 검색</label>
                    <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-soft)] px-3 py-3 ring-1 ring-[var(--line)]">
                      <Search className="h-4 w-4 text-[#6b7280]" />
                      <input
                        key={searchKeyword}
                        ref={searchInputRef}
                        defaultValue={searchKeyword}
                        placeholder="뉴스 검색어 입력"
                        className="w-full bg-transparent text-sm text-[#111827] outline-none"
                      />
                    </div>
                  </form>

                  <div className="mt-3 rounded-[20px] bg-[var(--surface-soft)] px-4 py-4">
                    <p className="text-xs font-semibold text-[#6b7280]">개인화 상태</p>
                    <p className="mt-1 text-sm font-bold text-[#111827]">익명 프로필 활성화</p>
                    <p className="mt-2 text-xs leading-5 text-[#6b7280]">
                      로그인 없이도 기기 안에서만 관심 신호를 저장하고 맞춤 뉴스를 정렬합니다.
                    </p>
                    <Link
                      href="/mypage"
                      onClick={() => setIsMenuOpen(false)}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-strong)]"
                    >
                      <Brain className="h-4 w-4" />
                      <span>설계 보기</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isHomeRoute && (
            <div className="border-t border-[var(--line)] px-3 pb-3 pt-2 sm:px-5">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {homeTabs.map(({ id, label, icon: Icon }) => {
                  const active = selectedHomeTab === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleHomeTabChange(id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        active
                          ? 'bg-[var(--primary-strong)] text-white'
                          : 'bg-[var(--surface-soft)] text-[var(--muted)] hover:bg-[var(--primary-weak)] hover:text-[var(--primary-strong)]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isNewsRoute && (
            <div className="border-t border-[var(--line)] px-4 pb-3 sm:px-5">
              <CategoryTabs selected={selectedCategory} onChange={handleCategoryChange} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
