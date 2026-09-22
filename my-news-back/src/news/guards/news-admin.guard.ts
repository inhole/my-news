import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_NEWS_ADMIN_KEY } from '../decorators/require-news-admin-key.decorator';

export const NEWS_ADMIN_KEY_HEADER = 'x-news-admin-key';

type RequestWithBody = Omit<Request, 'body'> & {
  body?: { refresh?: unknown };
};

@Injectable()
export class NewsAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const alwaysRequired = this.reflector.get<boolean>(
      REQUIRE_NEWS_ADMIN_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest<RequestWithBody>();
    // ValidationPipe's implicit boolean conversion runs after guards and
    // coerces any truthy value to `true` (via plain `Boolean(value)`), so the
    // raw pre-pipe body must be checked with the same truthiness to avoid a
    // bypass where e.g. refresh: "false" or refresh: 1 slips past a strict
    // `=== true` check here but still becomes `true` by the time it reaches
    // the service.
    const requiresAdminKey = alwaysRequired || Boolean(request.body?.refresh);

    if (!requiresAdminKey) {
      return true;
    }

    const adminApiKey = this.configService.get<string>('NEWS_ADMIN_API_KEY');

    if (!adminApiKey) {
      throw new ForbiddenException(
        'Admin operation is disabled: NEWS_ADMIN_API_KEY is not configured',
      );
    }

    const providedKey = request.headers[NEWS_ADMIN_KEY_HEADER];

    if (typeof providedKey !== 'string' || providedKey.length === 0) {
      throw new UnauthorizedException('Missing admin API key');
    }

    if (!this.isMatchingKey(providedKey, adminApiKey)) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }

  private isMatchingKey(provided: string, expected: string): boolean {
    const providedHash = createHash('sha256').update(provided).digest();
    const expectedHash = createHash('sha256').update(expected).digest();

    return timingSafeEqual(providedHash, expectedHash);
  }
}
