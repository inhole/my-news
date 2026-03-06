import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsBatchService } from './news-batch.service';

@Module({
  controllers: [NewsController],
  providers: [NewsService, NewsBatchService],
  exports: [NewsService],
})
export class NewsModule {}
