import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsAdminGuard } from './guards/news-admin.guard';
import { NewsService } from './news.service';
import { NewsBatchService } from './news-batch.service';
import { NewsRagService } from './news-rag.service';
import { NewsSummaryService } from './news-summary.service';
import { GeekNewsSource } from './sources/geeknews.source';
import { HackerNewsSource } from './sources/hacker-news.source';
import { NaverNewsSource } from './sources/naver-news.source';
import { NewsSourcesRegistry } from './sources/news-sources.registry';

@Module({
  controllers: [NewsController],
  providers: [
    NewsService,
    NewsBatchService,
    NewsRagService,
    NewsSummaryService,
    NewsAdminGuard,
    NaverNewsSource,
    GeekNewsSource,
    HackerNewsSource,
    NewsSourcesRegistry,
  ],
  exports: [NewsService],
})
export class NewsModule {}
