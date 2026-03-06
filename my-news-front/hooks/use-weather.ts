'use client';

import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '@/lib/api';

// 날씨 조회
export function useWeather(lat?: number, lon?: number) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => {
      if (typeof lat === 'number' && typeof lon === 'number') {
        return weatherApi.getWeather(lat, lon);
      }
      throw new Error('Invalid coordinates');
    },
    enabled: !!lat && !!lon,
    staleTime: 1000 * 60 * 10, // 10분 (API 캐시 시간과 동일)
  });
}
