import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SummarizeNewsDto {
  @ApiPropertyOptional({
    description: 'Ignore cached summary and regenerate it',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  refresh?: boolean = false;
}
