import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReindexNewsEmbeddingsDto {
  @ApiPropertyOptional({
    description: 'Maximum number of recent news items to index',
    example: 50,
    default: 50,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
