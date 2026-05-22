import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsBatchService } from './news-batch.service';
import { NewsRagService } from './news-rag.service';

@Module({
  controllers: [NewsController],
  providers: [NewsService, NewsBatchService, NewsRagService],
  exports: [NewsService],
})
export class NewsModule {}
