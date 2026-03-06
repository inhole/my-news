/**
 * API 통합 인덱스 파일
 *
 * 각 도메인별로 분리된 API를 재내보내기합니다.
 * - api/auth.ts: 인증 관련 API
 * - api/news.ts: 뉴스 관련 API
 * - api/bookmarks.ts: 북마크 관련 API
 * - api/weather.ts: 날씨 관련 API
 * - api/error-handler.ts: 에러 처리 유틸리티
 */

// 인증 API
export { authApi } from '@/lib/api/auth';

// 뉴스 API
export { newsApi } from '@/lib/api/news';

// 북마크 API
export { bookmarkApi } from '@/lib/api/bookmarks';

// 날씨 API
export { weatherApi } from '@/lib/api/weather';

// 에러 처리 유틸리티
export { handleApiError } from '@/lib/api/error-handler';



