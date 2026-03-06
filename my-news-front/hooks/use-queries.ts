/**
 * React Query Hooks 통합 인덱스 파일
 *
 * 각 도메인별로 분리된 hooks를 재내보내기합니다.
 * - use-news.ts: 뉴스 관련 hooks
 * - use-bookmarks.ts: 북마크 관련 hooks
 * - use-auth.ts: 인증 관련 hooks
 * - use-weather.ts: 날씨 관련 hooks
 */

// 뉴스 hooks
export {
  useInfiniteNews,
  useInfiniteNewsByCategory,
  useInfiniteSearchNews,
  useNewsDetail,
  useCategories,
  useFetchNews,
} from '@/hooks/use-news';

// 북마크 hooks
export {
  useAddBookmark,
  useInfiniteBookmarks,
  useRemoveBookmark,
} from '@/hooks/use-bookmarks';

// 인증 hooks
export {
  useRegister,
  useLogin,
  useLogout,
} from '@/hooks/use-auth';

// 날씨 hooks
export {
  useWeather,
} from '@/hooks/use-weather';

