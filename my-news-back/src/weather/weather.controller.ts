import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { GetWeatherDto } from './dto/get-weather.dto';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @Get()
  @ApiOperation({ summary: '현재 날씨 조회', description: '위도/경도를 기반으로 현재 날씨를 조회합니다. (Open-Meteo API 사용, 10분 캐싱)' })
  @ApiResponse({ status: 200, description: '날씨 조회 성공' })
  @ApiResponse({ status: 400, description: '잘못된 위도/경도 값' })
  @ApiResponse({ status: 502, description: '외부 날씨 API 오류' })
  async getWeather(@Query() query: GetWeatherDto) {
    return this.weatherService.getWeather(query.lat, query.lon);
  }

  @Get('clean-cache')
  @ApiOperation({ summary: '만료된 캐시 정리', description: '만료된 날씨 캐시 데이터를 삭제합니다.' })
  @ApiResponse({ status: 200, description: '캐시 정리 성공' })
  async cleanCache() {
    const count = await this.weatherService.cleanExpiredCache();
    return { message: `Cleaned ${count} expired cache entries`, count };
  }
}
