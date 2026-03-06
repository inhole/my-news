# 뉴스 배치 작업 (News Batch Job)

## 개요
뉴스 배치 작업은 외부 NewsAPI에서 주기적으로 뉴스를 가져와 데이터베이스에 캐시하는 자동화된 시스템입니다.

## 스케줄

### 1. 매시간 실행 (EVERY_HOUR)
- **실행 시간**: 매 시간 정각 (예: 00:00, 01:00, 02:00, ...)
- **대상 카테고리**: 
  - general
  - business
  - entertainment
  - health
  - science
  - sports
  - technology
- **작업**: 모든 카테고리의 최신 뉴스 100개씩 가져오기

### 2. 주요 업데이트 (하루 2회)
- **실행 시간**: 오전 6시, 오후 6시
- **대상 카테고리**:
  - general (일반)
  - technology (기술)
  - business (비즈니스)
- **작업**: 주요 카테고리의 뉴스를 우선적으로 업데이트

## 수동 트리거

관리자는 인증된 상태에서 API를 통해 수동으로 뉴스를 가져올 수 있습니다.

### 모든 카테고리 가져오기
```bash
POST /news/fetch
Authorization: Bearer {access_token}
```

### 특정 카테고리 가져오기
```bash
POST /news/fetch?category=technology
Authorization: Bearer {access_token}
```

## 로깅

배치 작업은 다음 정보를 로그로 남깁니다:
- 배치 작업 시작/완료 시간
- 각 카테고리별 가져온 기사 수
- 에러 발생 시 상세 정보

## Rate Limiting 방지

API Rate Limiting을 방지하기 위해:
- 각 카테고리 요청 사이에 2초 지연 적용
- 순차적으로 카테고리별 요청 처리

## 설정

배치 작업 스케줄을 변경하려면 `src/news/news-batch.service.ts` 파일에서 `@Cron` 데코레이터를 수정하세요.

### 크론 표현식 예시:
- `CronExpression.EVERY_HOUR` - 매시간
- `CronExpression.EVERY_30_MINUTES` - 30분마다
- `'0 6,18 * * *'` - 매일 오전 6시, 오후 6시
- `'0 */2 * * *'` - 2시간마다
- `'0 0 * * *'` - 매일 자정

## 환경 변수

배치 작업이 제대로 작동하려면 `.env` 파일에 다음 변수가 설정되어 있어야 합니다:

```env
NEWS_API_KEY=your_newsapi_key_here
```

NewsAPI 키는 [https://newsapi.org](https://newsapi.org)에서 무료로 발급받을 수 있습니다.

## 주의사항

- NewsAPI 무료 플랜은 하루 100회 요청 제한이 있습니다.
- 개발 환경에서는 스케줄 빈도를 줄이는 것을 권장합니다.
- 프로덕션 환경에서는 요청 횟수를 모니터링하세요.
