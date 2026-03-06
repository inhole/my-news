import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetNewsDto {
  @ApiPropertyOptional({
    description: '페이지네이션 커서 (이전 응답의 nextCursor 값)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    example: 20,
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '카테고리 필터 (slug)',
    example: 'technology',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: '검색 키워드',
    example: 'AI',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
