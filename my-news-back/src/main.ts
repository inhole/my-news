import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NewsBatchService } from './news/news-batch.service';

function isEnabled(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function parseCorsOrigins(value?: string): string[] {
  if (!value) {
    return ['http://localhost:3001'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const enableSwagger = isEnabled(
    configService.get<string>('ENABLE_SWAGGER'),
    configService.get<string>('NODE_ENV') !== 'production',
  );

  app.use(cookieParser());

  app.enableCors({
    origin: parseCorsOrigins(configService.get<string>('CORS_ORIGIN')),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('My News API')
      .setDescription('개인화 뉴스와 날씨 정보를 제공하는 My News API 문서')
      .setVersion('1.0')
      .addTag('news', '뉴스 조회, 카테고리 필터, 검색')
      .addTag('weather', '위치 기반 날씨 조회 (Open-Meteo)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);

  if (enableSwagger) {
    logger.log(`Swagger API Documentation: http://localhost:${port}/api`);
  }

  const newsBatchService = app.get(NewsBatchService);

  if (newsBatchService.shouldRunStartupFetch()) {
    logger.log('Starting initial news fetch...');
    newsBatchService.fetchAllCategoryNews().catch((error) => {
      logger.error('Failed to fetch initial news on startup', error);
    });
  } else {
    logger.log('Skipping initial news fetch on startup');
  }
}

void bootstrap();
