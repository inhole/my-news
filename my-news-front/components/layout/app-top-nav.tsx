'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Cloud, CloudDrizzle, CloudRain, CloudSnow, MapPin, Sun, Wind } from 'lucide-react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CategoryTabs } from '@/components/news/category-tabs';
import { useNewsDetail, useWeather } from '@/hooks/use-queries';

type HomeTab = 'weather' | 'headline' | 'trending' | 'personalized';

const homeTabs: Array<{ id: HomeTab; label: string }> = [
  { id: 'weather', label: '오늘' },
  { id: 'personalized', label: '맞춤' },
  { id: 'headline', label: '헤드라인' },
  { id: 'trending', label: '트렌딩' },
];

const GANGNAM_COORDS = { lat: 37.4979, lon: 127.0276 };
const GANGNAM_LABEL = '서울 강남';

function formatTodayLabel() {
  return new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: '맑음',
    1: '대체로 맑음',
    2: '구름 조금',
    3: '흐림',
    45: '안개',
    48: '서리 안개',
    51: '약한 이슬비',
    53: '이슬비',
    55: '강한 이슬비',
    61: '약한 비',
    63: '비',
    65: '강한 비',
    71: '약한 눈',
    73: '눈',
    75: '강한 눈',
    80: '소나기',
    81: '강한 소나기',
    82: '집중호우',
    95: '뇌우',
    96: '약한 우박 동반 뇌우',
    99: '강한 우박 동반 뇌우',
  };

  return weatherCodes[code] || '날씨 정보 없음';
}

function getWeatherIcon(code: number, className = 'h-4 w-4') {
  if (code === 0 || code === 1) return <Sun className={`${className} text-[#f59e0b]`} />;
  if (code >= 71 && code <= 75) return <CloudSnow className={`${className} text-[#93c5fd]`} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className={`${className} text-[#60a5fa]`} />;
  if ((code >= 61 && code <= 82) || code >= 95) {
    return <CloudRain className={`${className} text-[#3b82f6]`} />;
  }
  if (code >= 2 && code <= 3) return <Cloud className={`${className} text-[#9ca3af]`} />;
  return <Wind className={`${className} text-[#94a3b8]`} />;
}

function TopNavWeatherSummary() {
  const [coords, setCoords] = useState(GANGNAM_COORDS);
  const [locationLabel, setLocationLabel] = useState(GANGNAM_LABEL);
  const { data: weather, isLoading } = useWeather(coords.lat, coords.lon);

  useEffect(() => {
    let mounted = true;

    const setFallback = () => {
      if (!mounted) return;
      setCoords(GANGNAM_COORDS);
      setLocationLabel(GANGNAM_LABEL);
    };

    const requestCurrentPosition = () => {
      if (!('geolocation' in navigator)) {
        setFallback();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mounted) return;
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
          setLocationLabel('현재 위치');
        },
        () => setFallback(),
        { enableHighAccuracy: false, maximumAge: 1000 * 60 * 10, timeout: 8000 },
      );
    };

    if (typeof navigator === 'undefined') {
      return () => {
        mounted = false;
      };
    }

    if (!('permissions' in navigator)) {
      requestCurrentPosition();
      return () => {
        mounted = false;
      };
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!mounted) return;
        if (status.state === 'denied') {
          setFallback();
          return;
        }
        requestCurrentPosition();
      })
      .catch(() => requestCurrentPosition());

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading || !weather) {
    return (
      <Link href="/weather" className="top-nav-weather" aria-label="날씨 상세 보기">
        <Cloud className="h-4 w-4 animate-pulse text-[var(--primary-strong)]" />
        <span>날씨 불러오는 중</span>
      </Link>
    );
  }

  return (
    <Link href="/weather" className="top-nav-weather" aria-label="현재 날씨 상세 보기">
      {getWeatherIcon(weather.weatherCode)}
      <span className="top-nav-weather-temp">{Math.round(weather.temperature)}°</span>
      <span className="top-nav-weather-divider" />
      <span className="top-nav-weather-text">{getWeatherDescription(weather.weatherCode)}</span>
      <span className="top-nav-weather-divider" />
      <span className="top-nav-weather-location">
        <MapPin className="h-3 w-3" />
        {locationLabel}
      </span>
    </Link>
  );
}

export function AppTopNav() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
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
    <header className="top-nav-shell">
      <div className="top-nav-frame">
        <div className="top-nav-surface">
          <div className={`top-nav-head ${collapsed ? 'top-nav-head-collapsed' : ''}`}>
            <div className="top-nav-head-row">
              <div>
                <p className="top-nav-brand">My News</p>
                <p className="top-nav-date">{formatTodayLabel()}</p>
              </div>
              {isHomeRoute ? <TopNavWeatherSummary /> : null}
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
