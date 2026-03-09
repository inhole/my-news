# my-news

카테고리별 뉴스, 북마크, 위치 기반 날씨를 제공하는 반응형 뉴스 서비스입니다.

## 구성

- `my-news-front`: Next.js 16 프론트엔드
- `my-news-back`: NestJS 11 + Prisma 백엔드

## 기술 스택

- Frontend: Next.js, React, TypeScript, TanStack Query, Tailwind CSS
- Backend: NestJS, Prisma, PostgreSQL, Swagger, JWT 인증
- Database: Neon PostgreSQL

## 주요 화면

- 홈: 날씨 카드와 최신순 기준 핫 뉴스 5개 노출
- 뉴스: 상단 카테고리 탭이 고정되고 스크롤 방향에 따라 부드럽게 숨김/노출
- 상세: 원본 기사 메타에서 추출한 썸네일과 본문 후보 노출
- 마이페이지: 로그인 및 북마크 진입 메뉴

## 실행

루트에서 전체 의존성을 설치합니다.

```bash
npm run install:all
```

개별 실행 명령은 다음과 같습니다.

```bash
npm run dev:front
npm run dev:back
```

## 환경변수

프론트엔드:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

백엔드 필수값:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

백엔드 선택값:

- `NAVER_NEWS_API_URL`
- `PORT`
- `CORS_ORIGIN`

자세한 로컬 DB 설정은 [NEON_LOCAL_SETUP.md](/C:/dev/workspace/my-news/NEON_LOCAL_SETUP.md)에서 확인할 수 있습니다.

## 썸네일 정책

- 기본 뉴스 수집은 네이버 뉴스 API 메타데이터를 사용합니다.
- 추가로 원본 기사 HTML에서 `og:image`, `twitter:image`, 본문 후보 텍스트를 추출해 저장합니다.
- 원본 사이트 구조나 차단 정책에 따라 메타 추출이 실패할 수 있으며, 이 경우 프론트에서는 대체 썸네일 UI를 사용합니다.
