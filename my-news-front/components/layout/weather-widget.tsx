'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudRain, CloudSnow, Sun, Wind } from 'lucide-react';
import { useWeather } from '@/hooks/use-queries';

function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: '맑음',
    1: '대체로 맑음',
    2: '구름 조금',
    3: '흐림',
    45: '안개',
    48: '짙은 안개',
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
    96: '우박 동반 뇌우',
    99: '강한 우박 동반 뇌우',
  };
  return weatherCodes[code] || '날씨 정보 없음';
}

function getWeatherIcon(code: number) {
  if (code === 0 || code === 1) return <Sun className="h-8 w-8 text-[#f59e0b]" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className="h-8 w-8 text-[#60a5fa]" />;
  if ((code >= 61 && code <= 82) || code >= 95) {
    return <CloudRain className="h-8 w-8 text-[#3b82f6]" />;
  }
  if (code >= 71 && code <= 75) return <CloudSnow className="h-8 w-8 text-[#93c5fd]" />;
  if (code >= 2 && code <= 3) return <Cloud className="h-8 w-8 text-[#9ca3af]" />;
  return <Wind className="h-8 w-8 text-[#94a3b8]" />;
}

function formatHourLabel(time: string): string {
  const date = new Date(time);
  const hours = date.getHours();
  return `${hours.toString().padStart(2, '0')}시`;
}

function formatDayLabel(dateString: string, index: number): string {
  if (index === 0) {
    return '오늘';
  }

  const date = new Date(dateString);
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  return week[date.getDay()];
}

export function WeatherWidget() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState(() =>
    typeof navigator !== 'undefined' && !('geolocation' in navigator)
      ? '위치 정보를 지원하지 않는 브라우저입니다.'
      : ''
  );
  const { data: weather, isLoading } = useWeather(coords?.lat, coords?.lon);

  useEffect(() => {
    if (geoError || !('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      () => setGeoError('위치 권한이 없어서 날씨 정보를 불러오지 못했습니다.'),
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 10, timeout: 8000 }
    );
  }, [geoError]);

  if (geoError) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[var(--line)]">
        <p className="text-sm font-semibold text-[#6b7280]">현재 날씨</p>
        <p className="mt-3 text-sm leading-6 text-[#4b5563]">{geoError}</p>
      </section>
    );
  }

  if (isLoading || !weather) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[var(--line)]">
        <p className="text-sm font-semibold text-[#6b7280]">현재 날씨</p>
        <div className="mt-3 flex items-center gap-3">
          <Cloud className="h-6 w-6 animate-pulse text-[var(--primary)]" />
          <p className="text-sm text-[#6b7280]">날씨를 불러오는 중입니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[var(--line)]">
      <div className="bg-[linear-gradient(135deg,#3182f6_0%,#4f9cff_100%)] px-5 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">현재 날씨</p>
            <p className="mt-1 text-4xl font-bold">{Math.round(weather.temperature)}°</p>
            <p className="mt-1 text-sm text-white/90">{getWeatherDescription(weather.weatherCode)}</p>
          </div>
          <div className="rounded-2xl bg-white/20 p-2">{getWeatherIcon(weather.weatherCode)}</div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ca3af]">시간별</p>
          <div className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto pb-1">
            {weather.hourly.map((hour) => (
              <div
                key={hour.time}
                className="min-w-[68px] rounded-2xl bg-[#f3f4f6] px-3 py-2 text-center"
              >
                <p className="text-[11px] font-medium text-[#6b7280]">{formatHourLabel(hour.time)}</p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">{Math.round(hour.temperature)}°</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ca3af]">주간 예보</p>
          <div className="mt-2 space-y-2">
            {weather.daily.slice(0, 7).map((day, index) => (
              <div key={day.date} className="flex items-center justify-between rounded-xl bg-[#f9fafb] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-9 text-sm font-semibold text-[#374151]">{formatDayLabel(day.date, index)}</span>
                  <span className="text-xs text-[#9ca3af]">{getWeatherDescription(day.weatherCode)}</span>
                </div>
                <p className="text-sm font-medium text-[#111827]">
                  {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
