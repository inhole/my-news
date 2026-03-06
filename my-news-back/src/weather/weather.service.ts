import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  // Open-Meteo: free, no API key required
  private readonly openMeteoApiUrl: string;
  private readonly cacheDurationMinutes = 10;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.openMeteoApiUrl = this.configService.get<string>('OPEN_METEO_API_URL') || 'https://api.open-meteo.com/v1';
  }

  async getWeather(lat: number, lon: number) {
    // Round coordinates to 2 decimal places for caching
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;

    // Check cache
    const cached = await this.prisma.weatherCache.findUnique({
      where: {
        lat_lon: {
          lat: roundedLat,
          lon: roundedLon,
        },
      },
    });

    // Return cached data if not expired
    if (cached && cached.expiresAt > new Date()) {
      this.logger.log(`Cache hit for coordinates: ${roundedLat}, ${roundedLon}`);
      const cachedData = cached.data as any;
      const transformedWeather: Weather = {
        id: `${roundedLat}_${roundedLon}`,
        latitude: roundedLat,
        longitude: roundedLon,
        temperature: cachedData.current.temperature_2m,
        weatherCode: cachedData.current.weather_code,
        windSpeed: cachedData.current.wind_speed_10m,
        windDirection: cachedData.current.wind_direction_10m,
        humidity: cachedData.current.relative_humidity_2m,
        timestamp: cachedData.current.time,
        expiresAt: cached.expiresAt.toISOString(),
      };
      return transformedWeather;
    }

    // Fetch from API
    try {
      // Open-Meteo docs: https://open-meteo.com/
      // We request current weather + a small set of current variables.
      const response = await axios.get(`${this.openMeteoApiUrl}/forecast`, {
        params: {
           latitude: roundedLat,
           longitude: roundedLon,
           current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m',
           timezone: 'auto',
         },
       });

      const weatherData = response.data;

      // Calculate expiration time (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheDurationMinutes);

      // Transform to Weather interface format
      const transformedWeather: Weather = {
        id: `${roundedLat}_${roundedLon}`,
        latitude: roundedLat,
        longitude: roundedLon,
        temperature: weatherData.current.temperature_2m,
        weatherCode: weatherData.current.weather_code,
        windSpeed: weatherData.current.wind_speed_10m,
        windDirection: weatherData.current.wind_direction_10m,
        humidity: weatherData.current.relative_humidity_2m,
        timestamp: weatherData.current.time,
        expiresAt: expiresAt.toISOString(),
      };

      // Cache the result
      await this.prisma.weatherCache.upsert({
        where: {
          lat_lon: {
            lat: roundedLat,
            lon: roundedLon,
          },
        },
        update: {
          data: weatherData,
          expiresAt,
        },
        create: {
          lat: roundedLat,
          lon: roundedLon,
          data: weatherData,
          expiresAt,
        },
      });

      this.logger.log(`Fetched and cached weather for: ${roundedLat}, ${roundedLon}`);
      return transformedWeather;
    } catch (error) {
      this.logger.error('Error fetching weather data (Open-Meteo)', error);
      throw new BadGatewayException('Failed to fetch weather data');
    }
  }

  // Clean up expired cache entries
  async cleanExpiredCache() {
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
}
