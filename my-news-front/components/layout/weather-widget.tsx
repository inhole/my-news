'use client';

import { useEffect, useState } from 'react';
import {
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  Droplets,
  MapPin,
  Sun,
  Sunrise,
  Sunset,
  Wind,
} from 'lucide-react';
import { useWeather } from '@/hooks/use-queries';

const GANGNAM_COORDS = { lat: 37.4979, lon: 127.0276 };
const GANGNAM_LABEL = '대한민국 서울 강남';

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
    82: '집중호우',
    95: '뇌우',
    96: '약한 우박 동반 뇌우',
    99: '강한 우박 동반 뇌우',
  };

  return weatherCodes[code] || '날씨 정보 없음';
}

function getWeatherIcon(code: number, className = 'h-6 w-6') {
  if (code === 0 || code === 1) return <Sun className={`${className} text-[#f59e0b]`} />;
  if (code >= 71 && code <= 75) return <CloudSnow className={`${className} text-[#93c5fd]`} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className={`${className} text-[#60a5fa]`} />;
  if ((code >= 61 && code <= 82) || code >= 95) {
    return <CloudRain className={`${className} text-[#3b82f6]`} />;
  }
  if (code >= 2 && code <= 3) return <Cloud className={`${className} text-[#9ca3af]`} />;
  return <Wind className={`${className} text-[#94a3b8]`} />;
}

function formatHourLabel(time: string): string {
  const date = new Date(time);
  return `${date.getHours().toString().padStart(2, '0')}시`;
}

function isNowHour(time: string): boolean {
  const target = new Date(time);
  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate() &&
    target.getHours() === now.getHours()
  );
}

function formatDayLabel(dateString: string, index: number) {
  const date = new Date(dateString);
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  const shortDate = `${date.getMonth() + 1}.${date.getDate().toString().padStart(2, '0')}`;

  return {
    primary: index === 0 ? '오늘' : week[date.getDay()],
    secondary: shortDate,
  };
}

function formatTimeLabel(time: string): string {
  const date = new Date(time);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateLabel(time: string): string {
  const date = new Date(time);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getDustStatus(pm10: number): string {
  if (pm10 <= 30) return '좋음';
  if (pm10 <= 80) return '보통';
  if (pm10 <= 150) return '나쁨';
  return '매우 나쁨';
}

export function WeatherWidget() {
  const [coords, setCoords] = useState(GANGNAM_COORDS);
  const [locationLabel, setLocationLabel] = useState(GANGNAM_LABEL);
  const [geoNotice, setGeoNotice] = useState('');
  const { data: weather, isLoading } = useWeather(coords.lat, coords.lon);

  useEffect(() => {
    let mounted = true;

    const setGangnamFallback = (notice: string) => {
      if (!mounted) return;
      setCoords(GANGNAM_COORDS);
      setLocationLabel(GANGNAM_LABEL);
      setGeoNotice(notice);
    };

    const requestCurrentPosition = () => {
      if (!('geolocation' in navigator)) {
        setGangnamFallback('위치 정보를 사용할 수 없어 서울 강남 기준 날씨를 표시합니다.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mounted) return;
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
          setLocationLabel('현재 위치');
          setGeoNotice('위치 권한 기준으로 현재 위치 날씨를 표시합니다.');
        },
        () => setGangnamFallback('위치 권한이 없어 서울 강남 기준 날씨를 표시합니다.'),
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
          setGangnamFallback('위치 권한이 없어 서울 강남 기준 날씨를 표시합니다.');
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
      <section className="toss-card section-pad h-[360px]">
        <p className="text-sm font-semibold text-[#6b7280]">현재 날씨</p>
        <div className="mt-5 flex items-center gap-3">
          <Cloud className="h-7 w-7 animate-pulse text-[var(--primary)]" />
          <p className="text-sm text-[#6b7280]">날씨 정보를 불러오는 중입니다.</p>
        </div>
      </section>
    );
  }

  const today = weather.daily[0];
  const primaryDustStatus = getDustStatus(weather.airQuality.pm10);

  return (
    <section className="space-y-4">
      <section
        className="overflow-hidden rounded-[var(--radius-card)] border border-[#cfe0ff] text-white shadow-[0_20px_44px_rgba(52,118,217,0.24)]"
        style={{
          background:
            'linear-gradient(180deg, #69adff 0%, #4a90f5 42%, #2f6fd1 100%)',
        }}
      >
        <div className="section-pad relative">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute right-4 top-4 rounded-full bg-white/12 p-3">
            {getWeatherIcon(weather.weatherCode, 'h-10 w-10')}
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1.5 text-xs font-medium text-white/95">
              <MapPin className="h-3.5 w-3.5" />
              <span>{locationLabel}</span>
            </div>
            <p className="mt-3 text-sm font-medium text-white/80">{formatDateLabel(weather.timestamp)}</p>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-[68px] font-semibold leading-none tracking-[-0.06em]">{Math.round(weather.temperature)}°</p>
              <div className="pb-2">
                <p className="text-lg font-semibold text-white">{getWeatherDescription(weather.weatherCode)}</p>
                <p className="mt-1 text-sm text-white/80">
                  최고 {today ? Math.round(today.tempMax) : '-'}° / 최저 {today ? Math.round(today.tempMin) : '-'}°
                </p>
              </div>
            </div>
            {geoNotice ? <p className="mt-3 text-xs text-white/78">{geoNotice}</p> : null}
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2 rounded-[24px] bg-white/12 p-2 backdrop-blur-[6px]">
            <div className="rounded-[18px] bg-white/10 px-3 py-3">
              <p className="text-[11px] text-white/75">강수량</p>
              <p className="mt-1 text-base font-semibold">{weather.precipitation.toFixed(1)}mm</p>
            </div>
            <div className="rounded-[18px] bg-white/10 px-3 py-3">
              <p className="text-[11px] text-white/75">습도</p>
              <p className="mt-1 text-base font-semibold">{Math.round(weather.humidity)}%</p>
            </div>
            <div className="rounded-[18px] bg-white/10 px-3 py-3">
              <p className="text-[11px] text-white/75">바람</p>
              <p className="mt-1 text-base font-semibold">{Math.round(weather.windSpeed)}m/s</p>
            </div>
            <div className="rounded-[18px] bg-white/10 px-3 py-3">
              <p className="text-[11px] text-white/75">미세먼지</p>
              <p className="mt-1 text-base font-semibold">{primaryDustStatus}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="toss-card section-pad-sm border border-[#d9e6f7] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fd_100%)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8b95a1]">Today Details</p>
            <h3 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#111827]">생활 지표</h3>
          </div>
          <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-white/78 px-4 py-4">
            <div className="flex items-center gap-2 text-[#6b7280]">
              <Sunrise className="h-4 w-4 text-[#f59e0b]" />
              <span className="text-sm font-medium">일출</span>
            </div>
            <p className="mt-2 text-xl font-bold text-[#111827]">{today ? formatTimeLabel(today.sunrise) : '-'}</p>
          </div>
          <div className="rounded-[22px] bg-white/78 px-4 py-4">
            <div className="flex items-center gap-2 text-[#6b7280]">
              <Sunset className="h-4 w-4 text-[#fb7185]" />
              <span className="text-sm font-medium">일몰</span>
            </div>
            <p className="mt-2 text-xl font-bold text-[#111827]">{today ? formatTimeLabel(today.sunset) : '-'}</p>
          </div>
          <div className="rounded-[22px] bg-white/78 px-4 py-4">
            <div className="flex items-center gap-2 text-[#6b7280]">
              <Droplets className="h-4 w-4 text-[#3b82f6]" />
              <span className="text-sm font-medium">PM10</span>
            </div>
            <p className="mt-2 text-xl font-bold text-[#111827]">{weather.airQuality.pm10.toFixed(0)}</p>
            <p className="mt-1 text-xs font-medium text-[#4b5563]">{primaryDustStatus}</p>
          </div>
          <div className="rounded-[22px] bg-white/78 px-4 py-4">
            <div className="flex items-center gap-2 text-[#6b7280]">
              <Wind className="h-4 w-4 text-[#64748b]" />
              <span className="text-sm font-medium">PM2.5</span>
            </div>
            <p className="mt-2 text-xl font-bold text-[#111827]">{weather.airQuality.pm2_5.toFixed(0)}</p>
            <p className="mt-1 text-xs font-medium text-[#4b5563]">초미세먼지</p>
          </div>
        </div>
      </section>

      <section className="toss-card section-pad-sm border border-[#d9e6f7] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fd_100%)]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8b95a1]">Hourly Forecast</p>
        <div className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-1">
          {weather.hourly.map((hour) => {
            const active = isNowHour(hour.time);

            return (
              <div
                key={hour.time}
                className={`min-w-[82px] rounded-[22px] border px-3 py-3 text-center ${
                  active
                    ? 'border-[#7fb0ff] bg-[linear-gradient(180deg,#eef5ff_0%,#e1eeff_100%)] shadow-[0_8px_20px_rgba(59,130,246,0.12)]'
                    : 'border-[#dfeaf7] bg-white/82'
                }`}
              >
                <p className={`text-[11px] font-semibold ${active ? 'text-[#2563eb]' : 'text-[#6b7280]'}`}>
                  {active ? '지금' : formatHourLabel(hour.time)}
                </p>
                <div className="mt-2 flex justify-center">{getWeatherIcon(hour.weatherCode, 'h-5 w-5')}</div>
                <p className="mt-2 text-base font-bold text-[#111827]">{Math.round(hour.temperature)}°</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="toss-card section-pad-sm border border-[#d9e6f7] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fd_100%)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8b95a1]">Weekly Forecast</p>
            <h3 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#111827]">주간 날씨</h3>
          </div>
        </div>

        <div className="mt-3 divide-y divide-[#eef2f6]">
          {weather.daily.slice(0, 7).map((day, index) => {
            const label = formatDayLabel(day.date, index);

            return (
              <div key={day.date} className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-[78px] shrink-0">
                    <p className="text-[15px] font-bold text-[#111827]">{label.primary}</p>
                    <p className="mt-1 text-xs text-[#8b95a1]">{label.secondary}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f8fe]">
                    {getWeatherIcon(day.weatherCode, 'h-5 w-5')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#374151]">{getWeatherDescription(day.weatherCode)}</p>
                    <p className="mt-1 text-xs text-[#8b95a1]">강수량 {day.precipitation.toFixed(1)}mm</p>
                  </div>
                </div>
                <p className="shrink-0 text-[15px] font-bold tracking-[-0.02em] text-[#111827]">
                  {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
