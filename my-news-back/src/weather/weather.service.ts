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

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly openMeteoApiUrl: string;
  private readonly openMeteoAirQualityApiUrl: string;
  private readonly cacheDurationMinutes = 10;
  private readonly inflightRequests = new Map<string, Promise<Weather>>();
  private readonly weatherRequestTimeoutMs = 15000;
  private readonly weatherRetryDelayMs = 1200;
  private readonly maxWeatherFetchAttempts = 3;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.openMeteoApiUrl =
      this.configService.get<string>('OPEN_METEO_API_URL') ||
      'https://api.open-meteo.com/v1';
    this.openMeteoAirQualityApiUrl =
      this.configService.get<string>('OPEN_METEO_AIR_QUALITY_API_URL') ||
      'https://air-quality-api.open-meteo.com/v1';
  }

  async getWeather(lat: number, lon: number): Promise<Weather> {
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;
    const cacheKey = this.getCacheKey(roundedLat, roundedLon);

    const cached = await this.prisma.weatherCache.findUnique({
      where: {
        lat_lon: {
          lat: roundedLat,
          lon: roundedLon,
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      this.logger.log(
        `Cache hit for coordinates: ${roundedLat}, ${roundedLon}`,
      );
      return this.transformWeatherPayload(
        roundedLat,
        roundedLon,
        cached.data as OpenMeteoPayload,
        cached.expiresAt,
      );
    }

    const inFlight = this.inflightRequests.get(cacheKey);
    if (inFlight) {
      this.logger.log(`Joining in-flight weather request for: ${cacheKey}`);
      return inFlight;
    }

    const fetchPromise = this.fetchAndCacheWeather(
      roundedLat,
      roundedLon,
      cached,
    ).finally(() => {
      this.inflightRequests.delete(cacheKey);
    });

    this.inflightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
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

  private async fetchAndCacheWeather(
    roundedLat: number,
    roundedLon: number,
    staleCache: {
      data: Prisma.JsonValue;
      expiresAt: Date;
    } | null,
  ): Promise<Weather> {
    try {
      const [forecastResponse, airQualityResponse] = await Promise.all([
        this.fetchWithRetry<OpenMeteoForecastPayload>(
          `${this.openMeteoApiUrl}/forecast`,
          {
            latitude: roundedLat,
            longitude: roundedLon,
            current:
              'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation',
            hourly: 'temperature_2m,weather_code',
            daily:
              'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset',
            forecast_days: 7,
            timezone: 'auto',
          },
        ),
        this.fetchWithRetry<OpenMeteoAirQualityPayload>(
          `${this.openMeteoAirQualityApiUrl}/air-quality`,
          {
            latitude: roundedLat,
            longitude: roundedLon,
            current: 'pm10,pm2_5,us_aqi,european_aqi',
            timezone: 'auto',
          },
        ),
      ]);

      const weatherData: OpenMeteoPayload = {
        forecast: forecastResponse,
        airQuality: airQualityResponse,
      };

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

      this.logger.log(
        `Fetched and cached weather for: ${roundedLat}, ${roundedLon}`,
      );
      return this.transformWeatherPayload(
        roundedLat,
        roundedLon,
        weatherData,
        expiresAt,
      );
    } catch (error) {
      this.logger.error('Error fetching weather data (Open-Meteo)', error);

      if (staleCache) {
        this.logger.warn(
          `Serving stale weather cache for: ${roundedLat}, ${roundedLon}`,
        );
        return this.transformWeatherPayload(
          roundedLat,
          roundedLon,
          staleCache.data as OpenMeteoPayload,
          staleCache.expiresAt,
        );
      }

      throw new BadGatewayException('Failed to fetch weather data');
    }
  }

  private async fetchWithRetry<T>(
    url: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= this.maxWeatherFetchAttempts;
      attempt += 1
    ) {
      try {
        const response = await axios.get<T>(url, {
          params,
          timeout: this.weatherRequestTimeoutMs,
        });
        return response.data;
      } catch (error) {
        lastError = error;
        const shouldRetry =
          attempt < this.maxWeatherFetchAttempts &&
          this.isRetryableWeatherError(error);

        if (!shouldRetry) {
          break;
        }

        const status = this.getAxiosStatus(error);
        this.logger.warn(
          `Retrying weather request (${attempt}/${this.maxWeatherFetchAttempts}) for ${url}${status ? ` - status ${status}` : ''}`,
        );
        await this.delay(this.weatherRetryDelayMs * attempt);
      }
    }

    throw lastError;
  }

  private isRetryableWeatherError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const status = error.response?.status;
    return (
      status === 429 ||
      status === 408 ||
      (typeof status === 'number' && status >= 500) ||
      error.code === 'ECONNABORTED'
    );
  }

  private getAxiosStatus(error: unknown): number | undefined {
    if (!axios.isAxiosError(error)) {
      return undefined;
    }

    return error.response?.status;
  }

  private getCacheKey(lat: number, lon: number): string {
    return `${lat}:${lon}`;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private transformWeatherPayload(
    lat: number,
    lon: number,
    payload: OpenMeteoPayload,
    expiresAt: Date,
  ): Weather {
    const forecast =
      payload.forecast ??
      ({
        current: payload.current,
        hourly: payload.hourly,
        daily: payload.daily,
      } as OpenMeteoForecastPayload);
    const airQuality: OpenMeteoAirQualityPayload['current'] =
      payload.airQuality?.current;
    const currentTime = forecast.current?.time ?? '';
    const hourlyTimes = forecast.hourly?.time ?? [];
    const hourlyTemps = forecast.hourly?.temperature_2m ?? [];
    const hourlyCodes = forecast.hourly?.weather_code ?? [];

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
    const dailyTimes = forecast.daily?.time ?? [];
    const dailyMax = forecast.daily?.temperature_2m_max ?? [];
    const dailyMin = forecast.daily?.temperature_2m_min ?? [];
    const dailyCodes = forecast.daily?.weather_code ?? [];
    const dailyPrecipitation = forecast.daily?.precipitation_sum ?? [];
    const dailySunrise = forecast.daily?.sunrise ?? [];
    const dailySunset = forecast.daily?.sunset ?? [];

    for (let index = 0; index < Math.min(7, dailyTimes.length); index += 1) {
      const tempMax = dailyMax[index];
      const tempMin = dailyMin[index];
      const weatherCode = dailyCodes[index];
      const precipitation = dailyPrecipitation[index];
      const sunrise = dailySunrise[index];
      const sunset = dailySunset[index];

      if (
        typeof tempMax !== 'number' ||
        typeof tempMin !== 'number' ||
        typeof weatherCode !== 'number' ||
        typeof precipitation !== 'number' ||
        typeof sunrise !== 'string' ||
        typeof sunset !== 'string'
      ) {
        continue;
      }

      daily.push({
        date: dailyTimes[index],
        tempMax,
        tempMin,
        weatherCode,
        precipitation,
        sunrise,
        sunset,
      });
    }

    return {
      id: `${lat}_${lon}`,
      latitude: lat,
      longitude: lon,
      temperature: forecast.current?.temperature_2m ?? 0,
      weatherCode: forecast.current?.weather_code ?? 0,
      windSpeed: forecast.current?.wind_speed_10m ?? 0,
      windDirection: forecast.current?.wind_direction_10m ?? 0,
      humidity: forecast.current?.relative_humidity_2m ?? 0,
      precipitation: forecast.current?.precipitation ?? 0,
      timestamp: currentTime,
      expiresAt: expiresAt.toISOString(),
      airQuality: {
        pm10: airQuality?.pm10 ?? 0,
        pm2_5: airQuality?.pm2_5 ?? 0,
        usAqi: airQuality?.us_aqi ?? 0,
        europeanAqi: airQuality?.european_aqi ?? 0,
      },
      hourly,
      daily,
    };
  }
}

interface OpenMeteoPayload {
  forecast?: OpenMeteoForecastPayload;
  airQuality?: OpenMeteoAirQualityPayload;
  current?: OpenMeteoForecastPayload['current'];
  hourly?: OpenMeteoForecastPayload['hourly'];
  daily?: OpenMeteoForecastPayload['daily'];
}

interface OpenMeteoForecastPayload {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation: number;
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
    precipitation_sum: number[];
    sunrise: string[];
    sunset: string[];
  };
}

interface OpenMeteoAirQualityPayload {
  current?: {
    pm10: number;
    pm2_5: number;
    us_aqi: number;
    european_aqi: number;
  };
}
