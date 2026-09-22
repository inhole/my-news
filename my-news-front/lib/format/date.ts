const KOREA_TIME_ZONE = 'Asia/Seoul';

/**
 * 발행 시각을 "N분 전" 같은 상대 시간 문자열로 변환한다.
 * `now`를 주입할 수 있게 해 테스트와 마운트 이후 계산을 모두 지원한다.
 */
export function formatRelativeTime(dateString: string, now: Date = new Date()): string {
  const publishedAt = new Date(dateString);
  const diff = now.getTime() - publishedAt.getTime();
  const minutes = Math.max(1, Math.floor(diff / (1000 * 60)));

  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return publishedAt.toLocaleDateString('ko-KR', { timeZone: KOREA_TIME_ZONE });
}

/**
 * 기사 발행 시각을 "9월 22일 오후 03:20" 형태의 절대 시각 문자열로 변환한다.
 * `withYear`를 켜면 "2026년 9월 22일 오후 03:20"처럼 연도를 함께 표시한다.
 * "지금" 시점에 의존하지 않으므로 서버/클라이언트가 항상 같은 값을 렌더링한다.
 */
export function formatPublishedLabel(
  dateString: string,
  { withYear = false }: { withYear?: boolean } = {},
): string {
  return new Date(dateString).toLocaleString('ko-KR', {
    timeZone: KOREA_TIME_ZONE,
    year: withYear ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * "9월 22일" 형태의 짧은 날짜 라벨.
 * 상대 시간을 마운트 이후에 계산하는 목록에서 마운트 전 대체 문구로 사용한다.
 * 상대 시간 문자열과 폭이 비슷해 교체 시 레이아웃 흔들림이 거의 없다.
 */
export function formatShortDateLabel(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    timeZone: KOREA_TIME_ZONE,
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 상단 내비게이션의 오늘 날짜 라벨. "9월 22일 월" 형태.
 */
export function formatTodayLabel(now: Date = new Date()): string {
  return now.toLocaleDateString('ko-KR', {
    timeZone: KOREA_TIME_ZONE,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}
