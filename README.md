# my-news

카테고리 뉴스, 북마크, 위치 기반 날씨를 제공하는 반응형 뉴스 서비스입니다.

## 구성

- `my-news-front`: Next.js 16 프론트엔드
- `my-news-back`: NestJS 11 + Prisma 백엔드

## 기술 스택

- Frontend: Next.js, React, TypeScript, TanStack Query, Tailwind CSS
- Backend: NestJS, Prisma, PostgreSQL, Swagger, JWT 인증
- Database: Neon PostgreSQL

## 주요 화면

- 홈:
  - 상단 로고 영역 제거
  - 날씨 카드(현재/시간별/주간) + 최신 뉴스 5개 노출
  - 제목 중심의 깔끔한 카드 구성
- 뉴스:
  - 상단 카테고리 탭은 뉴스 탭에서만 노출
  - 아래 스크롤 시 숨김, 위 스크롤 시 재노출
  - 뉴스 카드 우측 상단 액션 아이콘(북마크/원문) 배치
  - 목록은 제목 중심으로 노출
- 상세:
  - 고정 액션바(뒤로/공유/북마크)
  - 본문 잘림 방지를 위한 `break-words`, `whitespace-pre-line` 적용
- 공통:
  - 하단 네비게이션 고정
  - safe-area 대응으로 고정 nav가 리스트/본문을 가리지 않도록 패딩 확보

## 실행

루트에서 전체 의존성을 설치합니다.

```bash
npm run install:all
```

개별 실행:

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
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

백엔드 선택:

- `NAVER_NEWS_API_URL`
- `PORT`
- `CORS_ORIGIN`

로컬 DB 설정은 [NEON_LOCAL_SETUP.md](/C:/dev/workspace/my-news/NEON_LOCAL_SETUP.md) 참고.

## 썸네일/원문 정책

- 기본 뉴스 수집은 Naver News API 메타데이터를 사용합니다.
- 추가로 원문 HTML의 `og:image`, `twitter:image`를 우선 추출해 썸네일로 사용합니다.
- 이미지가 없거나 접근 불가 시 프론트에서 대체 썸네일 UI를 표시합니다.
- `next/image` 호스트 오류 방지를 위해 현재는 `images.unoptimized = true`로 운영합니다.

## Local Mobile Check

- Start frontend with LAN binding: `npm run dev:front` (runs `next dev -H 0.0.0.0 -p 3001`)
- Frontend env (`my-news-front/.env.local`):
  - `NEXT_PUBLIC_API_BASE_URL=/api`
  - `BACKEND_BASE_URL=http://localhost:3000`
- Open from mobile with your PC IP: `http://<PC_LAN_IP>:3001`

## 2026-03-10 Weather Location Update

- Home weather now checks geolocation permission state before requesting current position.
- If location permission is denied, unavailable, or unsupported, weather falls back to default coordinates for Gangnam, Seoul (`37.4979`, `127.0276`).
- The weather card shows whether data is based on `내 위치 기준` or `서울 강남 기준`.
