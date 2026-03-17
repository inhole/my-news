import apiClient from '@/lib/api-client';
import { Weather } from '@/types';

export const weatherApi = {
  getWeather: async (lat: number, lon: number): Promise<Weather> => {
    const response = await apiClient.get(`/weather?lat=${lat}&lon=${lon}`);
    return response.data;
  },

  cleanCache: async (): Promise<{ message: string; count: number }> => {
    const response = await apiClient.get('/weather/clean-cache');
    return response.data;
  },
};
