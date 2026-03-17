# Anonymous Personalization Architecture

## 목표

`My News`를 로그인 없이도 개인화가 가능한 모바일 중심 PWA로 운영합니다.  
개인화 기준은 계정이 아니라 브라우저 단위의 익명 프로필입니다.

## 핵심 원칙

1. 모든 개인화 데이터는 사용자 브라우저에 저장합니다.
2. 홈 화면은 `날씨`와 `맞춤 뉴스` 두 개의 상단 탭으로 단순하게 유지합니다.
3. 맞춤 뉴스는 카테고리 선호도, 키워드 선호도, 최근 조회 이력을 합산해 정렬합니다.
4. 기사 카드에는 AI 3줄 요약을 우선 노출하고, OpenAI가 없으면 추출형 요약으로 폴백합니다.
5. 로그인, 관리자 페이지, 복잡한 운영 액션은 현재 범위에서 제외합니다.

## 홈 화면 구조

### 1. 날씨 탭

- 위치 기반 현재/시간별/주간 날씨 표시
- 오늘의 헤드라인 1건 표시
- 최신 뉴스 브리핑 표시

### 2. 맞춤 뉴스 탭

- 익명 프로필 기반으로 점수를 계산한 관심 뉴스 리스트 표시
- 각 카드에 `AI Summary` 3줄 표시
- 최근 읽은 카테고리와 키워드를 기반으로 우선순위 재정렬

## 프로필 구조

저장 위치: `localStorage`

- `anonymousProfile.id`
- `categoryScores`
- `keywordScores`
- `seenNewsIds`
- `createdAt`
- `updatedAt`

## 동작 흐름

### 1. 뉴스 소비 신호 수집

- 홈/맞춤 뉴스/뉴스 목록에서 기사 클릭
- 기사 클릭 시 카테고리 점수 증가
- 기사 제목/설명에서 추출한 키워드 점수 증가
- 본 기사 ID는 `seenNewsIds`에 저장

### 2. 맞춤 뉴스 점수 계산

예시 수식:

```text
personalizedScore = categoryAffinity * 2 + keywordAffinity + freshness - seenPenalty
```

- `categoryAffinity`: 선호 카테고리 누적 점수
- `keywordAffinity`: 제목/설명 키워드 매칭 점수
- `freshness`: 최신 기사 가산점
- `seenPenalty`: 이미 본 기사 감점

### 3. AI 3줄 요약

- 입력: `title`, `description`, `content`, `categoryName`
- 우선순위:
  1. `OPENAI_API_KEY`가 있으면 OpenAI Chat Completions 호출
  2. 없으면 설명/본문 기반 추출형 3줄 요약 생성
- 출력: 카드당 3개의 짧은 한국어 문장

## 모듈 위치

### Frontend

- `my-news-front/app/page.tsx`
  - 홈 탭 구성과 맞춤 뉴스 렌더링
- `my-news-front/app/api/ai/summarize/route.ts`
  - AI 요약 API와 폴백 로직
- `my-news-front/lib/personalization/anonymous-profile.ts`
  - 익명 프로필 생성/조회/저장
- `my-news-front/lib/personalization/signal-tracker.ts`
  - 클릭 기반 관심 신호 적재
- `my-news-front/lib/personalization/personalized-feed.ts`
  - 맞춤 뉴스 정렬

### Backend

- `my-news-back/src/news/news.service.ts`
  - 수집 기사 제공
- `my-news-back/src/news/news-batch.service.ts`
  - 배치 수집

## 확장 방향

1. 상세 페이지 체류 시간, 공유, 스크롤 깊이까지 신호 확장
2. 기사 본문 임베딩 또는 토픽 추출 기반 정교한 추천
3. 서버 캐시 또는 배치 요약 저장으로 요약 응답 속도 개선
4. 맞춤 뉴스 탭에 이유 설명 문구 추가
