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
    <section className="rounded-3xl bg-[linear-gradient(135deg,#3182f6_0%,#4f9cff_100%)] p-5 text-white shadow-[0_10px_30px_rgba(49,130,246,0.35)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">현재 날씨</p>
          <p className="mt-2 text-4xl font-bold">{Math.round(weather.temperature)}°</p>
          <p className="mt-1 text-sm text-white/90">{getWeatherDescription(weather.weatherCode)}</p>
        </div>
        <div className="rounded-2xl bg-white/20 p-2">{getWeatherIcon(weather.weatherCode)}</div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-white/90">
        <p>습도 {weather.humidity}%</p>
        <p>풍속 {Math.round(weather.windSpeed)}km/h</p>
        <p>{weather.latitude.toFixed(2)}, {weather.longitude.toFixed(2)}</p>
      </div>
    </section>
  );
}
