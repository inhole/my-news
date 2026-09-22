import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { NewsSourceType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { NewsSummaryService } from './news-summary.service';

interface NewsFindFirstArgs {
  where: Record<string, unknown>;
}

const lastFindFirstArgs = (findFirstMock: jest.Mock): NewsFindFirstArgs => {
  const call = findFirstMock.mock.calls[0] as [NewsFindFirstArgs];
  return call[0];
};

describe('NewsSummaryService', () => {
  let service: NewsSummaryService;
  let prisma: {
    news: { findFirst: jest.Mock };
    newsLlmSummary: { upsert: jest.Mock };
  };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    prisma = {
      news: { findFirst: jest.fn() },
      newsLlmSummary: { upsert: jest.fn() },
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ENABLE_LOCAL_LLM_SUMMARY') return 'true';
        return undefined;
      }),
    };

    service = new NewsSummaryService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );
  });

  it('only looks up press articles, so a community/blog id can never be summarized', async () => {
    prisma.news.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.summarizeNews('00000000-0000-4000-8000-000000000099'),
    ).rejects.toThrow(NotFoundException);

    const args = lastFindFirstArgs(prisma.news.findFirst);
    expect(args.where).toEqual(
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000099',
        sourceType: NewsSourceType.PRESS,
      }),
    );
  });
});
