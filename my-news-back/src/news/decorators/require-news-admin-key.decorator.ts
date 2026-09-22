import { SetMetadata } from '@nestjs/common';

export const REQUIRE_NEWS_ADMIN_KEY = 'requireNewsAdminKey';

export const RequireNewsAdminKey = () =>
  SetMetadata(REQUIRE_NEWS_ADMIN_KEY, true);
