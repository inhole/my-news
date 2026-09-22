import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { NewsAdminGuard } from './news-admin.guard';

function createContext(options: {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}): ExecutionContext {
  const request = {
    headers: options.headers ?? {},
    body: options.body ?? {},
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('NewsAdminGuard', () => {
  const ADMIN_KEY = 'correct-admin-key';

  function createGuard(alwaysRequired: boolean, adminApiKey?: string) {
    const reflector = {
      get: jest.fn().mockReturnValue(alwaysRequired),
    } as unknown as Reflector;
    const configService = {
      get: jest.fn().mockReturnValue(adminApiKey),
    } as unknown as ConfigService;

    return new NewsAdminGuard(reflector, configService);
  }

  it('allows the request when the route does not require an admin key and refresh is not true', () => {
    const guard = createGuard(false, ADMIN_KEY);
    const context = createContext({ body: {} });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a non-refresh summary request without any admin key check', () => {
    const guard = createGuard(false, ADMIN_KEY);
    const context = createContext({ body: { refresh: false } });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when the route always requires an admin key but none is configured', () => {
    const guard = createGuard(true, undefined);
    const context = createContext({
      headers: { 'x-news-admin-key': 'anything' },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws UnauthorizedException when the header is missing for an always-required route', () => {
    const guard = createGuard(true, ADMIN_KEY);
    const context = createContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the header value does not match', () => {
    const guard = createGuard(true, ADMIN_KEY);
    const context = createContext({
      headers: { 'x-news-admin-key': 'wrong-key' },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows the request when the header value matches for an always-required route', () => {
    const guard = createGuard(true, ADMIN_KEY);
    const context = createContext({
      headers: { 'x-news-admin-key': ADMIN_KEY },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('requires a matching admin key when refresh=true even without route metadata', () => {
    const guard = createGuard(false, ADMIN_KEY);
    const context = createContext({
      body: { refresh: true },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows refresh=true when a matching admin key is provided', () => {
    const guard = createGuard(false, ADMIN_KEY);
    const context = createContext({
      body: { refresh: true },
      headers: { 'x-news-admin-key': ADMIN_KEY },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('fails closed for refresh=true when the admin key is not configured', () => {
    const guard = createGuard(false, undefined);
    const context = createContext({
      body: { refresh: true },
      headers: { 'x-news-admin-key': 'anything' },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  describe('truthy refresh coercion bypass', () => {
    // ValidationPipe's implicit boolean conversion (enableImplicitConversion)
    // coerces any of these raw values to `true` via plain `Boolean(value)`
    // *after* guards run, so the guard must treat them as requiring the
    // admin key too, even though they are not strictly `=== true`.
    it.each([['true'], ['1'], [1], ['false'], ['0'], [{}], [[]]])(
      'requires the admin key when raw refresh is %p',
      (rawRefresh) => {
        const guard = createGuard(false, ADMIN_KEY);
        const context = createContext({ body: { refresh: rawRefresh } });

        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      },
    );

    it.each([[undefined], [null], [false], [0], ['']])(
      'does not require the admin key when raw refresh is %p',
      (rawRefresh) => {
        const guard = createGuard(false, ADMIN_KEY);
        const context = createContext({ body: { refresh: rawRefresh } });

        expect(guard.canActivate(context)).toBe(true);
      },
    );
  });
});
