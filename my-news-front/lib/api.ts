/**
 * API 통합 인덱스 파일
 *
 * 뉴스와 날씨 API만 외부로 노출합니다.
 */

export { newsApi } from '@/lib/api/news';
export { weatherApi } from '@/lib/api/weather';
export { handleApiError } from '@/lib/api/error-handler';
