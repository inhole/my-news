# my-news

카테고리 기반 뉴스 탐색, 익명 개인화 추천, 헤드라인/트렌딩 정리를 제공하는 개인 프로젝트입니다.

## 프로젝트 구성

- `my-news-front`: Next.js 프론트엔드
- `my-news-back`: NestJS + Prisma 백엔드
- DB: Neon PostgreSQL

## 운영 기준

- 환경은 `로컬`, `운영` 두 가지만 사용합니다.
- 로컬 백엔드는 `my-news-back/.env`를 사용합니다.
- 운영 백엔드는 `my-news-back/.env.production`을 사용합니다.
- 로컬 프론트는 `my-news-front/.env.local`을 사용합니다.
- 운영 프론트는 `my-news-front/.env.production`을 사용합니다.

## 로컬 실행

```bash
npm install
npm run dev:back
npm run dev:front
```

기본 주소:

- 프론트: `http://localhost:3001`
- 백엔드: `http://localhost:3000`

## 운영 실행

```bash
npm run build
npm run start:prod
```

## 필수 환경 변수

백엔드:

- `DATABASE_URL`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `CORS_ORIGIN`

선택 제어값:

- `ENABLE_SWAGGER`
- `ENABLE_NEWS_SCHEDULE`
- `ENABLE_STARTUP_NEWS_FETCH`
- `OPEN_METEO_API_URL`
- `OPEN_METEO_AIR_QUALITY_API_URL`

## 배포 전 확인

- `npm run lint`
- `npm run test --workspace my-news-back -- --runInBand`
- `npm run build`
- `/health` 확인
- 프론트 `/api` 리라이트 확인

## 문서

- [기능 정리](C:/dev/workspace/my-news/docs/기능-정리.md)
- [환경 설정](C:/dev/workspace/my-news/docs/환경-설정.md)
- [배포 체크리스트](C:/dev/workspace/my-news/docs/배포-체크리스트.md)
- [로컬 DB 설정](C:/dev/workspace/my-news/docs/로컬-DB-설정.md)
- [개인화 구조](C:/dev/workspace/my-news/docs/개인화-구조.md)
