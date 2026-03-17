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
  precipitation: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAirQuality {
  pm10: number;
  pm2_5: number;
  usAqi: number;
  europeanAqi: number;
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
  precipitation: number;
  timestamp: string;
  expiresAt: string;
  airQuality: WeatherAirQuality;
  hourly: WeatherHourlyPoint[];
  daily: WeatherDailyPoint[];
}
