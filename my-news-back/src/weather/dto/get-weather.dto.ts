import { IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetWeatherDto {
  @ApiProperty({
    description: '위도 (-90 ~ 90)',
    example: 37.5665,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  lat: number;

  @ApiProperty({
    description: '경도 (-180 ~ 180)',
    example: 126.978,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  lon: number;
}
