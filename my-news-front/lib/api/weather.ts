import apiClient from '@/lib/api-client';
import { Weather } from '@/types';

// ==================== 날씨 API ====================
export const weatherApi = {
  // 현재 날씨 조회
  getWeather: async (lat: number, lon: number): Promise<Weather> => {
    const response = await apiClient.get(`/weather?lat=${lat}&lon=${lon}`);
    return response.data;
  },

  // 캐시 정리 (관리자용)
  cleanCache: async (): Promise<{ message: string; count: number }> => {
    const response = await apiClient.get('/weather/clean-cache');
    return response.data;
  },
};
