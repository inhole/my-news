export interface WeatherHourlyPoint {
  time: string;
  temperature: number;
  weatherCode: number;
}

export interface WeatherDailyPoint {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

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
  hourly: WeatherHourlyPoint[];
  daily: WeatherDailyPoint[];
}
