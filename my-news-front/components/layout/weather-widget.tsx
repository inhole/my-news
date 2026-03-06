'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, Wind, CloudSnow, CloudDrizzle } from 'lucide-react';
import { useWeather } from '@/hooks/use-queries';

// WMO Weather Code 해석 함수
const getWeatherDescription = (code: number): string => {
  const weatherCodes: Record<number, string> = {
    0: '맑음',
    1: '대체로 맑음',
    2: '부분적으로 흐림',
    3: '흐림',
    45: '안개',
    48: '서리 안개',
    51: '가벼운 이슬비',
    53: '보통 이슬비',
    55: '심한 이슬비',
    61: '약한 비',
    63: '보통 비',
    65: '강한 비',
    71: '약한 눈',
    73: '보통 눈',
    75: '강한 눈',
    80: '약한 소나기',
    81: '보통 소나기',
    82: '강한 소나기',
    95: '뇌우',
    96: '약한 우박을 동반한 뇌우',
    99: '강한 우박을 동반한 뇌우',
  };
  return weatherCodes[code] || '알 수 없음';
};

// Weather Code에 따른 아이콘
const getWeatherIcon = (code: number) => {
  if (code === 0 || code === 1) return <Sun className="w-8 h-8" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className="w-8 h-8" />;
  if (code >= 61 && code <= 82) return <CloudRain className="w-8 h-8" />;
  if (code >= 71 && code <= 75) return <CloudSnow className="w-8 h-8" />;
  if (code >= 95) return <CloudRain className="w-8 h-8" />; // 뇌우
  if (code >= 2 && code <= 3) return <Cloud className="w-8 h-8" />;
  return <Wind className="w-8 h-8" />;
};

export function WeatherWidget() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const { data: weather, isLoading, error } = useWeather(coords?.lat, coords?.lon);

  console.log('weather: ', weather)

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (err: GeolocationPositionError) => {
          console.error('위치 정보를 가져올 수 없습니다:', err.message);
        }
      );
    }
  }, []);

  if (isLoading || !weather) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
        <div className="flex items-center gap-2">
          <Cloud className="w-6 h-6 animate-pulse" />
          <span className="text-sm">날씨 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // 날씨 오류 시 조용히 숨김
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">
            위도 {weather.latitude.toFixed(2)}, 경도 {weather.longitude.toFixed(2)}
          </p>
          <p className="text-3xl font-bold">{Math.round(weather.temperature)}°C</p>
          <p className="text-sm opacity-90">{getWeatherDescription(weather.weatherCode)}</p>
          <div className="flex gap-3 mt-2 text-xs opacity-90">
            <span>습도 {weather.humidity}%</span>
            <span>풍속 {Math.round(weather.windSpeed)}km/h</span>
          </div>
        </div>
        <div className="opacity-90">
          {getWeatherIcon(weather.weatherCode)}
        </div>
      </div>
    </div>
  );
}
