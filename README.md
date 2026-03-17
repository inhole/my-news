# my-news

카테고리 뉴스와 위치 기반 날씨를 제공하는 모바일 웹/PWA 프로젝트입니다.  
현재 방향은 `로그인 없는 익명 개인화 뉴스 서비스`입니다.

## 구성

- `my-news-front`: Next.js 16 프론트엔드
- `my-news-back`: NestJS 11 + Prisma 백엔드

## 기술 스택

- Frontend: Next.js, React, TypeScript, TanStack Query, Tailwind CSS
- Backend: NestJS, Prisma, PostgreSQL, Swagger
- Database: Neon PostgreSQL

## 현재 제품 방향

- 로그인과 회원 북마크 기능 제거
- 브라우저 단위 익명 프로필로 개인화 확장
- 관리자 없는 단순 운영 배포를 전제로 자동 수집과 읽기 중심 구조 유지
- 웹 우선 개발 후 PWA/TWA 또는 앱 래핑으로 확장 가능

## 주요 화면

- 홈
  - 위치 기반 날씨 카드
  - 오늘의 헤드라인
  - 최신 뉴스 브리프
- 뉴스 목록
  - 카테고리 필터
  - 검색
  - 무한 스크롤
- 뉴스 상세
  - 본문 HTML 렌더링
  - 공유
  - 원문 이동
- 내 피드
  - 익명 개인화 구조 설명
  - 로컬 프로필 기반 동작 방식 안내

## 실행

루트에서 전체 워크스페이스 의존성을 설치합니다.

```bash
npm run install:all
```

개발 서버 실행:

```bash
npm run dev:front
npm run dev:back
```

## 환경 변수

프론트엔드:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

백엔드 필수:

- `DATABASE_URL`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

백엔드 선택:

- `NAVER_NEWS_API_URL`
- `PORT`
- `CORS_ORIGIN`

로컬 DB 설정은 [NEON_LOCAL_SETUP.md](/C:/dev/workspace/my-news/NEON_LOCAL_SETUP.md)를 참고합니다.

## 데이터 모델 변경 메모

로그인 제거에 따라 Prisma 스키마에서 `User`, `Bookmark` 모델을 제거했습니다.  
DB를 현재 스키마에 맞추려면 백엔드에서 스키마 반영이 필요합니다.

```bash
npm run db:generate --workspace my-news-back
npm run db:push --workspace my-news-back
```

## 설계 문서

- [anonymous-personalization-architecture.md](/C:/dev/workspace/my-news/docs/anonymous-personalization-architecture.md)

## 2026-03-17 업데이트

- 인증과 북마크 의존성 제거
- 뉴스/날씨 중심 API 문서로 Swagger 단순화
- 상단/하단 내비를 익명 개인화 방향에 맞춰 정리
- 익명 개인화 아키텍처 문서 추가
