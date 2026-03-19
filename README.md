# my-news

카테고리 뉴스와 위치 기반 날씨를 함께 제공하는 모바일 중심 뉴스 서비스입니다.

## 구성

- `my-news-front`: Next.js 16 프론트엔드
- `my-news-back`: NestJS 11 + Prisma 백엔드

## 기술 스택

- Frontend: Next.js, React, TypeScript, TanStack Query, Tailwind CSS
- Backend: NestJS, Prisma, PostgreSQL, Swagger
- Database: Neon PostgreSQL

## 주요 화면

- 홈 상단 탭: `날씨`, `맞춤 뉴스`, `헤드라인`, `실검`
- 날씨 탭: 현재 위치 기반 날씨, 시간별/주간 예보
- 맞춤 뉴스 탭: 익명 개인화 기반 추천 뉴스와 AI 3줄 요약
- 헤드라인 탭: 주요 뉴스 5건 리스트
- 실검 탭: 헤드라인/키워드 신호를 합친 실검 뉴스 리스트
- 뉴스 목록: 카테고리 필터, 검색, 무한 스크롤
- 뉴스 상세: 본문 렌더링, 원문 이동
- 마이페이지: 익명 개인화 구조 설명과 로그인 상태 안내

## 홈 탭 노출 선정 기준

### 맞춤 뉴스

- 후보 데이터는 `useInfiniteNews()`로 현재까지 불러온 전체 뉴스입니다.
- 정렬은 `rankPersonalizedNews(articles, profile)` 결과를 그대로 사용합니다.
- 개인화 프로필에는 익명 사용자 기준의 카테고리 선호도, 키워드 반응, 최근 행동 이력이 반영됩니다.
- 각 뉴스 카드에는 3줄 요약이 붙습니다.
  - 백엔드 배치가 생성해 DB에 저장한 요약을 사용합니다.
  - 아직 생성되지 않았으면 기본 안내 문구 3줄을 임시로 노출합니다.
- 노출 방식은 무한 스크롤입니다.
  - 최초 8건을 노출합니다.
  - 하단 센티널이 보이면 8건씩 추가 노출합니다.
  - 현재 로컬 후보군을 모두 사용했고 다음 뉴스 페이지가 있으면, 다음 페이지를 먼저 불러온 뒤 계속 노출합니다.

### 헤드라인

- 후보 데이터는 `useInfiniteNews()`로 현재까지 불러온 전체 뉴스입니다.
- 현재 로드된 뉴스 배열의 앞쪽 5건을 그대로 사용합니다.
- 별도 개인화 가중치나 추가 점수는 적용하지 않습니다.
- 정렬은 서버에서 내려온 뉴스 순서를 유지합니다.

### 실검

- 후보 데이터는 `useInfiniteNews()`로 현재까지 불러온 전체 뉴스와 기사 제목/설명에서 추출한 키워드 신호입니다.
- 키워드 추출 시 다음 규칙을 적용합니다.
  - 소문자 기준 정규화
  - 특수문자 제거
  - 길이 2자 미만 토큰 제외
  - 불용어 제외
    - 예: `오늘`, `이번`, `관련`, `기자`, `뉴스`, `정부`, `시장`, `오전`, `대한민국`, `속보`, `단독`
- 정렬은 헤드라인 위치 점수와 키워드 반복 점수를 합산해 계산합니다.
  - 현재 뉴스 목록 상위 10건에 기본 점수를 부여합니다.
  - 키워드 출현 빈도와 키워드 순위에 따라 추가 점수를 부여합니다.
  - 최종 점수 내림차순으로 정렬합니다.
  - 동점이면 `publishedAt`이 더 최신인 뉴스를 우선합니다.
- 최종 상위 10건을 노출합니다.

## 실행

루트에서 의존성을 설치합니다.

```bash
npm install
```

개발 서버 실행:

```bash
npm run dev --workspace my-news-front
npm run start:dev --workspace my-news-back
```

## 환경 변수

프론트엔드:

```env
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_BASE_URL=http://localhost:3000
```

백엔드 필수:

- `DATABASE_URL`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

백엔드 선택:

- `NAVER_NEWS_API_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPEN_METEO_API_URL`
- `OPEN_METEO_AIR_QUALITY_API_URL`
- `PORT`
- `CORS_ORIGIN`

로컬 DB 설정은 [NEON_LOCAL_SETUP.md](/C:/dev/workspace/my-news/NEON_LOCAL_SETUP.md)를 참고합니다.

## 문서

- [anonymous-personalization-architecture.md](/C:/dev/workspace/my-news/docs/anonymous-personalization-architecture.md)
- [home-ui-2026-03-19.md](/C:/dev/workspace/my-news/docs/home-ui-2026-03-19.md)
