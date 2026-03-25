import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { NewsService } from './news.service';
import { NEWS_CATEGORY_SLUGS } from './news-categories';

@Injectable()
export class NewsBatchService {
  private readonly logger = new Logger(NewsBatchService.name);
  private readonly scheduleEnabled: boolean;
  private readonly startupFetchEnabled: boolean;

  constructor(
    private newsService: NewsService,
    private configService: ConfigService,
  ) {
    this.scheduleEnabled = this.isEnabled(
      this.configService.get<string>('ENABLE_NEWS_SCHEDULE'),
      true,
    );
    this.startupFetchEnabled = this.isEnabled(
      this.configService.get<string>('ENABLE_STARTUP_NEWS_FETCH'),
      this.configService.get<string>('NODE_ENV') !== 'production',
    );
  }

  @Cron('0 * * * *', { timeZone: 'Asia/Seoul' })
  async fetchAllCategoryNews() {
    if (!this.scheduleEnabled) {
      this.logger.log('Scheduled news fetch skipped because it is disabled');
      return 0;
    }

    this.logger.log('Starting scheduled news fetch batch job...');

    const categories = NEWS_CATEGORY_SLUGS;
    let totalFetched = 0;

    for (const category of categories) {
      try {
        const count = await this.newsService.fetchAndCacheNews(category);
        totalFetched += count;
        this.logger.log(`Fetched ${count} articles for category: ${category}`);
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
    return totalFetched;
  }

  @Cron('0 6,18 * * *', { timeZone: 'Asia/Seoul' })
  async fetchMajorNews() {
    if (!this.scheduleEnabled) {
      this.logger.log('Major news update skipped because schedule is disabled');
      return 0;
    }

    this.logger.log('Starting major news update...');

    const priorityCategories = ['general', 'technology', 'business'];
    let totalFetched = 0;

    for (const category of priorityCategories) {
      try {
        const count = await this.newsService.fetchAndCacheNews(category);
        totalFetched += count;
        this.logger.log(
          `Major update: Fetched ${count} articles for ${category}`,
        );
        await this.delay(2000);
      } catch (error) {
        this.logger.error(`Major update failed for ${category}`, error);
      }
    }

    return totalFetched;
  }

  async manualFetchNews(category?: string) {
    this.logger.log(
      `Manual fetch triggered for category: ${category || 'all'}`,
    );

    if (category) {
      return this.newsService.fetchAndCacheNews(category);
    }

    return this.fetchAllCategoryNews();
  }

  shouldRunStartupFetch(): boolean {
    return this.startupFetchEnabled;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isEnabled(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) {
      return defaultValue;
    }

    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
}
