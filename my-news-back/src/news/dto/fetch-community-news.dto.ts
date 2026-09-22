import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const COMMUNITY_NEWS_SOURCE_IDS = ['geeknews', 'hacker-news'] as const;

export type CommunityNewsSourceId = (typeof COMMUNITY_NEWS_SOURCE_IDS)[number];

export class FetchCommunityNewsDto {
  @ApiProperty({
    description: '수동으로 수집할 커뮤니티 뉴스 소스',
    enum: COMMUNITY_NEWS_SOURCE_IDS,
    example: 'geeknews',
  })
  @IsIn(COMMUNITY_NEWS_SOURCE_IDS)
  source!: CommunityNewsSourceId;
}
