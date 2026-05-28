import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsBatchService } from './news-batch.service';
import { NewsRagService } from './news-rag.service';
import { NewsSummaryService } from './news-summary.service';

@Module({
  controllers: [NewsController],
  providers: [
    NewsService,
    NewsBatchService,
    NewsRagService,
    NewsSummaryService,
  ],
  exports: [NewsService],
})
export class NewsModule {}
