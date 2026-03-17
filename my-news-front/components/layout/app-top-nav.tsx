'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CategoryTabs } from '@/components/news/category-tabs';
import { useNewsDetail } from '@/hooks/use-queries';

type HomeTab = 'weather' | 'headline' | 'trending' | 'personalized';

const homeTabs: Array<{ id: HomeTab; label: string }> = [
  { id: 'weather', label: '날씨' },
  { id: 'headline', label: '헤드라인' },
  { id: 'trending', label: '실검' },
  { id: 'personalized', label: '맞춤 뉴스' },
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
  const [collapsed, setCollapsed] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollTopRef = useRef(0);
  const tickingRef = useRef(false);
  const isHomeRoute = pathname === '/';
  const isNewsRoute = pathname === '/news' || pathname?.startsWith('/news/');
  const newsId = typeof params.id === 'string' ? params.id : '';
  const selectedHomeTab = (searchParams.get('tab') as HomeTab) || 'weather';
  const { data: detailNews } = useNewsDetail(isNewsRoute ? newsId : '');

  const selectedCategory = useMemo(() => {
    if (pathname === '/news') return searchParams.get('category') || '';
    if (pathname?.startsWith('/news/')) return detailNews?.category.slug || '';
    return '';
  }, [detailNews?.category.slug, pathname, searchParams]);

  useEffect(() => {
    const scrollContainer = document.getElementById('app-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentScrollTop = scrollContainer.scrollTop;
        const previousScrollTop = lastScrollTopRef.current;

        if (currentScrollTop <= 16) {
          setCollapsed(false);
        } else if (currentScrollTop > previousScrollTop + 8) {
          setCollapsed(true);
        } else if (currentScrollTop < previousScrollTop - 8) {
          setCollapsed(false);
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
      const nextOffset = headerRef.current ? `${headerRef.current.offsetHeight}px` : '0px';
      document.documentElement.style.setProperty('--app-top-nav-offset', nextOffset);
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);

    return () => {
      window.removeEventListener('resize', updateOffset);
      document.documentElement.style.setProperty('--app-top-nav-offset', '0px');
    };
  }, [collapsed, isHomeRoute, isNewsRoute, selectedCategory, selectedHomeTab]);

  const handleCategoryChange = (categorySlug: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (categorySlug) nextParams.set('category', categorySlug);
    else nextParams.delete('category');
    const nextQuery = nextParams.toString();
    router.push(nextQuery ? `/news?${nextQuery}` : '/news');
  };

  const handleHomeTabChange = (tab: HomeTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', tab);
    router.push(`/?${nextParams.toString()}`);
  };

  return (
    <header ref={headerRef} className="top-nav-shell">
      <div className="top-nav-frame">
        <div className="top-nav-surface">
          <div className={`top-nav-head ${collapsed ? 'top-nav-head-collapsed' : ''}`}>
            <div className="top-nav-head-row">
              <div>
                <p className="top-nav-brand">My News</p>
                <p className="top-nav-date">{formatTodayLabel()}</p>
              </div>
            </div>
          </div>

          {isHomeRoute ? (
            <div className="top-nav-tabs-wrap">
              <div className="top-nav-tabs-scroll">
                <div className="top-nav-tabs">
                  {homeTabs.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleHomeTabChange(id)}
                      className={`top-nav-tab ${selectedHomeTab === id ? 'top-nav-tab-active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {isNewsRoute ? (
            <div className="top-nav-tabs-wrap top-nav-tabs-news">
              <CategoryTabs selected={selectedCategory} onChange={handleCategoryChange} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
