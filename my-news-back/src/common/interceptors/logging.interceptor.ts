import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - ${ip} - ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<Response>();
          const delay = Date.now() - now;
          this.logger.log(
            `Response: ${method} ${url} ${response.statusCode} - ${delay}ms`,
          );
        },
        error: (error: unknown) => {
          const delay = Date.now() - now;
          const stack = error instanceof Error ? error.stack : String(error);
          this.logger.error(
            `Error Response: ${method} ${url} - ${delay}ms`,
            stack,
          );
        },
      }),
    );
  }
}
