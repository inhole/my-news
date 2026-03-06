import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NewsService } from './news.service';

@Injectable()
export class NewsBatchService {
  private readonly logger = new Logger(NewsBatchService.name);

  constructor(private newsService: NewsService) {}

  // Run every 1 hour
  @Cron('0 * * * *')
  async fetchAllCategoryNews() {
    this.logger.log('Starting scheduled news fetch batch job...');

    const categories = [
      'general',
      'business',
      'entertainment',
      'health',
      'science',
      'sports',
      'technology',
    ];

    let totalFetched = 0;

    for (const category of categories) {
      try {
        const count = await this.newsService.fetchAndCacheNews(category);
        totalFetched += count;
        this.logger.log(`Fetched ${count} articles for category: ${category}`);

        // Add delay between API calls to avoid rate limiting
        await this.delay(2000);
      } catch (error) {
        this.logger.error(
          `Failed to fetch news for category: ${category}`,
          error,
        );
      }
    }

    this.logger.log(
      `Batch job completed. Total articles fetched: ${totalFetched}`,
    );
  }

  // Run at 6 AM and 6 PM every day for major updates
  @Cron('0 6,18 * * *')
  async fetchMajorNews() {
    this.logger.log('Starting major news update...');

    const priorityCategories = ['general', 'technology', 'business'];

    for (const category of priorityCategories) {
      try {
        const count = await this.newsService.fetchAndCacheNews(category);
        this.logger.log(
          `Major update: Fetched ${count} articles for ${category}`,
        );
        await this.delay(2000);
      } catch (error) {
        this.logger.error(`Major update failed for ${category}`, error);
      }
    }
  }

  // Manual trigger method (can be called via API endpoint)
  async manualFetchNews(category?: string) {
    this.logger.log(
      `Manual fetch triggered for category: ${category || 'all'}`,
    );

    if (category) {
      return await this.newsService.fetchAndCacheNews(category);
    } else {
      return await this.fetchAllCategoryNews();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
