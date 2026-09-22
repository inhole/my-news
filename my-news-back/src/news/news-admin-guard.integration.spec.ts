import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { NewsController } from './news.controller';
import { NewsAdminGuard } from './guards/news-admin.guard';
import { NewsRagService } from './news-rag.service';
import { NewsService } from './news.service';
import { NewsSummaryService } from './news-summary.service';

// Exercises the real request pipeline (Guard runs before ValidationPipe,
// per Nest's request lifecycle: Middleware -> Guards -> Interceptors (pre) ->
// Pipes -> Controller) with ConfigService mocked to return a fixed admin key,
// proving that a client cannot smuggle a truthy-but-not-strictly-true
// `refresh` value (e.g. "false", 1) past the admin guard even though
// ValidationPipe's implicit boolean conversion would later coerce it to
// `true` for the service call. No real DB/API calls are made;
// NewsService/NewsRagService/NewsSummaryService are fully mocked.
describe('NewsAdminGuard integration (guard + ValidationPipe lifecycle)', () => {
  const ADMIN_API_KEY = 'integration-admin-key';
  let app: INestApplication<App>;
  let summarizeNews: jest.Mock;

  beforeAll(async () => {
    summarizeNews = jest.fn().mockResolvedValue({ summary: 'ok' });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NewsController],
      providers: [
        NewsAdminGuard,
        Reflector,
        { provide: NewsService, useValue: {} },
        { provide: NewsRagService, useValue: {} },
        {
          provide: NewsSummaryService,
          useValue: { summarizeNews },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'NEWS_ADMIN_API_KEY' ? ADMIN_API_KEY : undefined,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    summarizeNews.mockClear();
  });

  it('rejects refresh: "false" without the admin key even though it would transform to true', async () => {
    const response = await request(app.getHttpServer())
      .post('/news/news-1/summary')
      .send({ refresh: 'false' });

    expect(response.status).toBe(401);
    expect(summarizeNews).not.toHaveBeenCalled();
  });

  it('rejects refresh: 1 without the admin key', async () => {
    const response = await request(app.getHttpServer())
      .post('/news/news-1/summary')
      .send({ refresh: 1 });

    expect(response.status).toBe(401);
    expect(summarizeNews).not.toHaveBeenCalled();
  });

  it('allows refresh: "true" with a valid admin key and forwards a coerced boolean true', async () => {
    const response = await request(app.getHttpServer())
      .post('/news/news-1/summary')
      .set('x-news-admin-key', ADMIN_API_KEY)
      .send({ refresh: 'true' });

    expect(response.status).toBe(201);
    expect(summarizeNews).toHaveBeenCalledWith('news-1', true);
  });

  it('allows a plain cached-summary request with no refresh and no admin key', async () => {
    const response = await request(app.getHttpServer())
      .post('/news/news-1/summary')
      .send({});

    expect(response.status).toBe(201);
    expect(summarizeNews).toHaveBeenCalledWith('news-1', false);
  });
});
