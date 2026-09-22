import { Injectable } from '@nestjs/common';
import { GeekNewsSource } from './geeknews.source';
import { HackerNewsSource } from './hacker-news.source';
import { NaverNewsSource } from './naver-news.source';
import { NewsSourceAdapter } from './news-source.interface';

/**
 * Lookup from source id (e.g. `'naver'`, `'geeknews'`, `'hacker-news'`) to
 * its adapter. A later stage wires this up to new endpoints/cron jobs; for
 * now it just centralizes adapter construction.
 */
@Injectable()
export class NewsSourcesRegistry {
  private readonly adapters = new Map<string, NewsSourceAdapter>();

  constructor(
    naverNewsSource: NaverNewsSource,
    geekNewsSource: GeekNewsSource,
    hackerNewsSource: HackerNewsSource,
  ) {
    this.register(naverNewsSource);
    this.register(geekNewsSource);
    this.register(hackerNewsSource);
  }

  register(adapter: NewsSourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): NewsSourceAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): NewsSourceAdapter[] {
    return [...this.adapters.values()];
  }
}
