'use client';

import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  MapPin,
  Sun,
  Wind,
} from 'lucide-react';
import { useWeather } from '@/hooks/use-queries';

function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: '맑음',
    1: '대체로 맑음',
    2: '구름 조금',
    3: '흐림',
    45: '안개',
    48: '서리 낀 안개',
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
    82: '집중 호우',
    95: '뇌우',
    96: '우박 동반 뇌우',
    99: '강한 우박 동반 뇌우',
  };

  return weatherCodes[code] || '날씨 정보 없음';
}

function getWeatherIcon(code: number) {
  if (code === 0 || code === 1) return <Sun className="h-9 w-9 text-[#ffb54c]" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className="h-9 w-9 text-[#69a8ff]" />;
  if ((code >= 61 && code <= 82) || code >= 95) {
    return <CloudRain className="h-9 w-9 text-[#4c7dff]" />;
  }
  if (code >= 71 && code <= 75) return <CloudSnow className="h-9 w-9 text-[#8ea6d9]" />;
  if (code >= 2 && code <= 3) return <Cloud className="h-9 w-9 text-[#8a98aa]" />;
  return <Wind className="h-9 w-9 text-[#7f91a6]" />;
}

export function WeatherWidget() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState(() =>
    typeof navigator !== 'undefined' && !('geolocation' in navigator)
      ? '위치 정보를 지원하지 않는 브라우저입니다.'
      : ''
  );
  const { data: weather, isLoading, error } = useWeather(coords?.lat, coords?.lon);

  useEffect(() => {
    if (geoError || !('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        setGeoError('위치 권한이 없어서 현재 날씨를 가져오지 못했습니다.');
      },
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 10,
        timeout: 8000,
      }
    );
  }, [geoError]);

  if (geoError) {
    return (
      <section className="rounded-[28px] border border-[#d9dce2] bg-[#fbfaf7] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold text-[#7f8793]">오늘의 날씨</p>
        <p className="mt-3 text-base leading-7 text-[#4b5563]">{geoError}</p>
      </section>
    );
  }

  if (isLoading || !weather) {
    return (
      <section className="rounded-[28px] bg-[linear-gradient(135deg,#2d4e76_0%,#4d79b5_100%)] p-5 text-white shadow-[0_18px_42px_rgba(47,57,71,0.25)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/75">오늘의 날씨</p>
            <p className="mt-3 text-2xl font-black tracking-[-0.04em]">불러오는 중</p>
            <p className="mt-2 text-sm text-white/80">위치 기반으로 실시간 날씨를 확인하고 있습니다.</p>
          </div>
          <Cloud className="h-10 w-10 animate-pulse text-white/80" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[28px] border border-[#d9dce2] bg-[#fbfaf7] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold text-[#7f8793]">오늘의 날씨</p>
        <p className="mt-3 text-base leading-7 text-[#4b5563]">날씨 정보를 가져오지 못했습니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] bg-[linear-gradient(135deg,#2f4663_0%,#5379a5_56%,#9ec1df_100%)] p-5 text-white shadow-[0_18px_42px_rgba(47,57,71,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/70">오늘의 날씨</p>
          <p className="mt-3 text-[2.4rem] font-black tracking-[-0.05em]">
            {Math.round(weather.temperature)}°C
          </p>
          <p className="mt-2 text-base font-semibold">{getWeatherDescription(weather.weatherCode)}</p>
        </div>
        <div className="rounded-full bg-white/12 p-3 backdrop-blur-sm">
          {getWeatherIcon(weather.weatherCode)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
          <p className="text-white/70">습도</p>
          <p className="mt-1 font-semibold">{weather.humidity}%</p>
        </div>
        <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
          <p className="text-white/70">풍속</p>
          <p className="mt-1 font-semibold">{Math.round(weather.windSpeed)} km/h</p>
        </div>
        <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
          <p className="text-white/70">위도</p>
          <p className="mt-1 font-semibold">{weather.latitude.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
          <p className="text-white/70">경도</p>
          <p className="mt-1 font-semibold">{weather.longitude.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 text-xs text-white/70">
        <MapPin className="h-4 w-4" />
        <span>현재 위치 기준 날씨</span>
      </div>
    </section>
  );
}
