export type HomeTab = 'weather' | 'headline' | 'trending' | 'personalized';

export const DEFAULT_HOME_TAB: HomeTab = 'weather';

export const HOME_TABS: Array<{ id: HomeTab; label: string }> = [
  { id: 'weather', label: '오늘' },
  { id: 'personalized', label: '맞춤' },
  { id: 'headline', label: '헤드라인' },
  { id: 'trending', label: '트렌딩' },
];

const HOME_TAB_IDS = new Set<string>(HOME_TABS.map((tab) => tab.id));

export function isHomeTab(value: string | null | undefined): value is HomeTab {
  return typeof value === 'string' && HOME_TAB_IDS.has(value);
}

/**
 * `?tab=` 쿼리 파라미터를 안전하게 HomeTab으로 변환한다.
 * 값이 없거나 허용 목록에 없으면 기본 탭으로 대체한다.
 */
export function resolveHomeTab(value: string | null | undefined): HomeTab {
  return isHomeTab(value) ? value : DEFAULT_HOME_TAB;
}
