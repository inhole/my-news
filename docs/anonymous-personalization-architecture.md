# Anonymous Personalization Architecture

## 목표

`My News`를 로그인 없이도 개인화가 가능한 모바일 중심 PWA로 운영합니다.
개인화 데이터는 계정이 아니라 브라우저 범위의 익명 프로필에 저장합니다.

## 원칙

1. 모든 개인화 데이터는 사용자 브라우저에 저장합니다.
2. 홈 화면은 공통 상단 탭에서 `날씨`, `헤드라인`, `실시간`, `맞춤 뉴스`를 제공합니다.
3. 맞춤 뉴스는 카테고리 선호, 키워드 선호, 최근 조회 이력을 합산해 정렬합니다.
4. 기사 카드는 배치에서 생성한 AI 120자 요약을 우선 노출하고, OpenAI 키가 없으면 추출형 요약으로 대체합니다.
5. 관리자용 개인화 운영 화면은 현재 범위에서 제외합니다.

## 홈 화면 구조

### 1. 날씨 탭

- 현재 위치를 간략 라벨로 표시합니다.
- 현재, 시간별, 주간 날씨를 표시합니다.
- 현재 날씨 요약에 강수량, 일출, 일몰, 습도, PM10/PM2.5 미세먼지를 포함합니다.
- 주간 예보에 `오늘`, `n월 n일`, 일별 강수량을 표시합니다.

### 2. 헤드라인 탭

- 오늘의 헤드라인 1건을 표시합니다.
- 최신 뉴스 브리프를 함께 제공합니다.

### 3. 실시간 탭

- 수집 기사 제목과 설명에서 반복 빈도가 높은 검색어를 집계합니다.
- 검색어별 연관 기사 진입 링크를 제공합니다.

### 4. 맞춤 뉴스 탭

- 익명 프로필 기반 점수로 관심 뉴스 리스트를 표시합니다.
- 각 카드에 `AI Summary` 120자 이내 단문을 제공합니다.
- 리스트형 카드 UI로 빠른 탐색을 지원합니다.

## 익명 프로필 구조

저장 위치: `localStorage`

- `anonymousProfile.id`
- `categoryScores`
- `keywordScores`
- `seenNewsIds`
- `createdAt`
- `updatedAt`

## 동작 흐름

### 1. 뉴스 소비 신호 수집

- 홈, 맞춤 뉴스, 뉴스 목록에서 기사 클릭
- 클릭 시 카테고리 점수 증가
- 제목/설명에서 추출한 키워드 점수 증가
- 본 기사 ID를 `seenNewsIds`에 저장

### 2. 맞춤 뉴스 점수 계산

```text
personalizedScore = categoryAffinity * 2 + keywordAffinity + freshness - seenPenalty
```

- `categoryAffinity`: 선호 카테고리 누적 점수
- `keywordAffinity`: 제목/설명 키워드 일치 점수
- `freshness`: 최신 기사 가산점
- `seenPenalty`: 이미 본 기사 감점

### 3. AI 120자 요약

- 입력: `title`, `description`, `content`, `categoryName`
- 우선순위:
1. 뉴스 배치 실행 시 `OPENAI_API_KEY`가 있으면 OpenAI Chat Completions 사용
2. 없으면 설명/본문 기반 추출형 단문 요약 생성
- 출력: 카드용 120자 이내 단문 요약

## 모듈 위치

### Frontend

- `my-news-front/app/page.tsx`
- `my-news-front/app/api/ai/summarize/route.ts`
- `my-news-front/components/layout/weather-widget.tsx`
- `my-news-front/lib/personalization/anonymous-profile.ts`
- `my-news-front/lib/personalization/signal-tracker.ts`
- `my-news-front/lib/personalization/personalized-feed.ts`

### Backend

- `my-news-back/src/news/news.service.ts`
- `my-news-back/src/news/news-batch.service.ts`
- `my-news-back/src/weather/weather.service.ts`
- `my-news-back/src/weather/weather.controller.ts`

## 확장 방향

1. 상세 페이지 체류 시간, 공유, 스크롤 깊이 기반 선호 확장
2. 본문 요약 품질 향상을 위한 서버 캐시 또는 배치 요약
3. 맞춤 뉴스 카드에 추천 이유 문구 추가
4. 위치 검색 결과에 최근 조회 지역 또는 즐겨찾기 도입
