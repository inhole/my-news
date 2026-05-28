import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SemanticSearchDto {
  @ApiPropertyOptional({
    description: 'Semantic search query',
    example: 'AI semiconductor export outlook',
  })
  @IsString()
  q!: string;

  @ApiPropertyOptional({
    description: 'Maximum number of matched news items',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
