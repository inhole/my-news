// Weather
export interface Weather {
  id: string;
  latitude: number;
  longitude: number;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  timestamp: string;
  expiresAt: string;
}
