# my-news

카테고리 뉴스와 위치 기반 날씨를 함께 제공하는 모바일 중심 PWA 프로젝트입니다. 현재 방향은 로그인 없는 익명 개인화 뉴스 서비스입니다.

## 구성

- `my-news-front`: Next.js 16 프론트엔드
- `my-news-back`: NestJS 11 + Prisma 백엔드

## 기술 스택

- Frontend: Next.js, React, TypeScript, TanStack Query, Tailwind CSS
- Backend: NestJS, Prisma, PostgreSQL, Swagger
- Database: Neon PostgreSQL

## 주요 화면

- 홈
  - 공통 상단 nav 탭: `날씨`, `헤드라인`, `실검`, `맞춤 뉴스`
  - 날씨 탭: 위치 기반 날씨만 집중 노출
  - 헤드라인 탭: 오늘의 헤드라인과 최신 뉴스 브리핑
  - 실검 탭: 수집 기사 기준 실시간 키워드와 관련 뉴스
  - 맞춤 뉴스 탭: 나의 관심 뉴스 리스트, AI 3줄 요약, 리스트형 썸네일
- 뉴스 목록
  - 카테고리 필터
  - 검색
  - 무한 스크롤
- 뉴스 상세
  - 본문 HTML 렌더링
  - 원문 이동
- 마이페이지
  - 익명 개인화 구조 설명
  - 로컬 프로필 상태 안내

## 실행

루트에서 전체 워크스페이스 의존성을 설치합니다.

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
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

- `OPENAI_API_KEY`가 있으면 맞춤 뉴스 3줄 요약에 OpenAI API를 사용합니다.
- 키가 없으면 서버에서 추출형 요약으로 안전하게 폴백합니다.

백엔드 필수:

- `DATABASE_URL`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

백엔드 선택:

- `NAVER_NEWS_API_URL`
- `PORT`
- `CORS_ORIGIN`

로컬 DB 설정은 [NEON_LOCAL_SETUP.md](/C:/dev/workspace/my-news/NEON_LOCAL_SETUP.md)를 참고합니다.

## 문서

- [anonymous-personalization-architecture.md](/C:/dev/workspace/my-news/docs/anonymous-personalization-architecture.md)

## 2026-03-17 업데이트

- 홈 상단에 `날씨 / 맞춤 뉴스` 탭 추가
- 홈 탭을 공통 상단 nav에 통합하고 `날씨 / 헤드라인 / 실검 / 맞춤 뉴스`로 재구성
- 맞춤 뉴스 탭에 익명 프로필 기반 관심 뉴스 정렬과 리스트형 카드 적용
- 맞춤 뉴스 카드에 AI 3줄 요약 추가
- OpenAI 미설정 환경을 위한 추출형 요약 폴백 추가
