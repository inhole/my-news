import * as fs from 'fs';
import * as path from 'path';
import type { ConfigService } from '@nestjs/config';
import { GeekNewsSource } from './geeknews.source';

const FIXTURE_PATH = path.join(
  __dirname,
  '__fixtures__',
  'geeknews-sample.xml',
);

describe('GeekNewsSource', () => {
  let source: GeekNewsSource;
  let configService: { get: jest.Mock };
  let sampleXml: string;

  beforeAll(() => {
    sampleXml = fs.readFileSync(FIXTURE_PATH, 'utf8');
  });

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue(undefined) };
    source = new GeekNewsSource(configService as unknown as ConfigService);
  });

  it('is offline-safe/configured by default (no API key needed)', () => {
    expect(source.isConfigured()).toBe(true);
    expect(source.skipContentCrawl).toBe(true);
  });

  it('parses a captured Atom feed into normalized articles, skipping the empty entry', () => {
    const articles = source.parseFeed(sampleXml);

    // fixture has 3 <entry> elements: 2 real + 1 genuinely empty one
    expect(articles).toHaveLength(2);
  });

  it('unwraps the CDATA title, reads the href attribute as the link, and parses the published date', () => {
    const [first] = source.parseFeed(sampleXml);

    expect(first.title).toBe(
      'Show GN: ITLAND - 짧게 플레이하고 기록을 겨루는 웹 게임 플랫폼',
    );
    expect(first.url).toBe('https://news.hada.io/topic?id=34106');
    expect(first.publishedAt).toBeInstanceOf(Date);
    expect(first.publishedAt.toISOString()).toBe(
      new Date('2026-09-22T14:01:50+09:00').toISOString(),
    );
  });

  it('maps the GeekNews submitter to author, not source, and fixes source to GeekNews', () => {
    const [first] = source.parseFeed(sampleXml);

    expect(first.author).toBe('yunsell');
    expect(first.source).toBe('GeekNews');
  });

  it('derives a short excerpt from the HTML content instead of storing it whole', () => {
    const [, second] = source.parseFeed(sampleXml);

    expect(second.description.length).toBeGreaterThan(0);
    expect(second.description).not.toContain('<');
    expect(second.description).not.toContain('<li>');
  });

  it('skips the empty <entry> without throwing', () => {
    expect(() => source.parseFeed(sampleXml)).not.toThrow();
    const articles = source.parseFeed(sampleXml);
    expect(articles.every((a) => a.title && a.url)).toBe(true);
  });
});
