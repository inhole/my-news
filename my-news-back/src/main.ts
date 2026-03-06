import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NewsBatchService } from './news/news-batch.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Cookie parser
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || 'http://localhost:3001',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion for query params
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('My News API')
    .setDescription('나만의 관심 뉴스 카테고리 - REST API 문서')
    .setVersion('1.0')
    .addTag('auth', '인증 - 회원가입, 로그인, 토큰 갱신')
    .addTag('news', '뉴스 - 뉴스 조회, 카테고리별 필터링, 검색')
    .addTag('bookmarks', '북마크 - 북마크 추가, 삭제, 조회')
    .addTag('weather', '날씨 - 위치 기반 날씨 조회 (Open-Meteo)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Access Token을 입력하세요',
        in: 'header',
      },
      'access-token',
    )
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
      description: 'Refresh Token (HttpOnly Cookie)',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Start serverㅇ
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger API Documentation: http://localhost:${port}/api`);

  // Fetch initial news on startup
  const newsBatchService = app.get(NewsBatchService);
  logger.log('Starting initial news fetch...');
  newsBatchService.fetchAllCategoryNews().catch((error) => {
    logger.error('Failed to fetch initial news on startup', error);
  });
}
bootstrap();
