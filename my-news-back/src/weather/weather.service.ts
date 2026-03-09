import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly openMeteoApiUrl: string;
  private readonly cacheDurationMinutes = 10;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.openMeteoApiUrl =
      this.configService.get<string>('OPEN_METEO_API_URL') ||
      'https://api.open-meteo.com/v1';
  }

  async getWeather(lat: number, lon: number): Promise<Weather> {
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;

    const cached = await this.prisma.weatherCache.findUnique({
      where: {
        lat_lon: {
          lat: roundedLat,
          lon: roundedLon,
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      this.logger.log(`Cache hit for coordinates: ${roundedLat}, ${roundedLon}`);
      return this.transformWeatherPayload(
        roundedLat,
        roundedLon,
        cached.data as OpenMeteoPayload,
        cached.expiresAt,
      );
    }

    try {
      const response = await axios.get<OpenMeteoPayload>(
        `${this.openMeteoApiUrl}/forecast`,
        {
          params: {
            latitude: roundedLat,
            longitude: roundedLon,
            current:
              'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
            hourly: 'temperature_2m,weather_code',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min',
            forecast_days: 7,
            timezone: 'auto',
          },
        },
      );

      const weatherData = response.data;
      const weatherDataForCache = weatherData as Prisma.InputJsonValue;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheDurationMinutes);

      await this.prisma.weatherCache.upsert({
        where: {
          lat_lon: {
            lat: roundedLat,
            lon: roundedLon,
          },
        },
        update: {
          data: weatherDataForCache,
          expiresAt,
        },
        create: {
          lat: roundedLat,
          lon: roundedLon,
          data: weatherDataForCache,
          expiresAt,
        },
      });

      this.logger.log(`Fetched and cached weather for: ${roundedLat}, ${roundedLon}`);
      return this.transformWeatherPayload(
        roundedLat,
        roundedLon,
        weatherData,
        expiresAt,
      );
    } catch (error) {
      this.logger.error('Error fetching weather data (Open-Meteo)', error);
      throw new BadGatewayException('Failed to fetch weather data');
    }
  }

  async cleanExpiredCache(): Promise<number> {
    const result = await this.prisma.weatherCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned ${result.count} expired weather cache entries`);
    return result.count;
  }

  private transformWeatherPayload(
    lat: number,
    lon: number,
    payload: OpenMeteoPayload,
    expiresAt: Date,
  ): Weather {
    const currentTime = payload.current?.time ?? '';
    const hourlyTimes = payload.hourly?.time ?? [];
    const hourlyTemps = payload.hourly?.temperature_2m ?? [];
    const hourlyCodes = payload.hourly?.weather_code ?? [];

    let startIndex = hourlyTimes.findIndex((time) => time >= currentTime);
    if (startIndex < 0) {
      startIndex = 0;
    }

    const hourly: WeatherHourlyPoint[] = [];
    for (
      let index = startIndex;
      index < Math.min(startIndex + 12, hourlyTimes.length);
      index += 1
    ) {
      const temperature = hourlyTemps[index];
      const weatherCode = hourlyCodes[index];

      if (typeof temperature !== 'number' || typeof weatherCode !== 'number') {
        continue;
      }

      hourly.push({
        time: hourlyTimes[index],
        temperature,
        weatherCode,
      });
    }

    const daily: WeatherDailyPoint[] = [];
    const dailyTimes = payload.daily?.time ?? [];
    const dailyMax = payload.daily?.temperature_2m_max ?? [];
    const dailyMin = payload.daily?.temperature_2m_min ?? [];
    const dailyCodes = payload.daily?.weather_code ?? [];

    for (let index = 0; index < Math.min(7, dailyTimes.length); index += 1) {
      const tempMax = dailyMax[index];
      const tempMin = dailyMin[index];
      const weatherCode = dailyCodes[index];

      if (
        typeof tempMax !== 'number' ||
        typeof tempMin !== 'number' ||
        typeof weatherCode !== 'number'
      ) {
        continue;
      }

      daily.push({
        date: dailyTimes[index],
        tempMax,
        tempMin,
        weatherCode,
      });
    }

    return {
      id: `${lat}_${lon}`,
      latitude: lat,
      longitude: lon,
      temperature: payload.current?.temperature_2m ?? 0,
      weatherCode: payload.current?.weather_code ?? 0,
      windSpeed: payload.current?.wind_speed_10m ?? 0,
      windDirection: payload.current?.wind_direction_10m ?? 0,
      humidity: payload.current?.relative_humidity_2m ?? 0,
      timestamp: currentTime,
      expiresAt: expiresAt.toISOString(),
      hourly,
      daily,
    };
  }
}

interface OpenMeteoPayload {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}
