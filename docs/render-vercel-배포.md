# Render + Vercel 배포 가이드

이 프로젝트는 모노레포 구조이며 서비스별 배포 대상은 아래와 같습니다.

- 백엔드: `my-news-back` -> Render Web Service
- 프런트엔드: `my-news-front` -> Vercel Project
- DB: Neon PostgreSQL

배포 순서는 반드시 `Neon -> Render -> Vercel` 순서로 진행합니다.

## 1. 사전 준비

배포 전에 아래 값을 준비합니다.

- GitHub 저장소 연결
- Neon 운영 DB의 `DATABASE_URL`
- Naver 뉴스 API 운영 키
- 최종 프런트 도메인
- 최종 백엔드 도메인

이 저장소 기준 운영 환경 변수 예시는 아래 파일을 기준으로 맞춥니다.

- `my-news-back/.env.production.example`
- `my-news-front/.env.production.example`

## 2. Neon 준비

1. Neon에서 운영용 프로젝트 또는 데이터베이스를 생성합니다.
2. Prisma 운영 연결용 `DATABASE_URL`을 복사합니다.
3. 반드시 Prisma가 바로 연결할 수 있는 Direct URL을 사용합니다.

예시:

```env
DATABASE_URL=postgresql://[NEON_USER]:[NEON_PASSWORD]@[NEON_DIRECT_HOST]/[DB_NAME]?sslmode=require&channel_binding=require
```

## 3. Render에 백엔드 배포

### 3-1. 서비스 생성

1. Render 대시보드에서 `New +` -> `Web Service`를 선택합니다.
2. GitHub 저장소를 연결합니다.
3. 브랜치는 운영 브랜치로 선택합니다.
4. `Root Directory`는 `my-news-back`으로 설정합니다.

이 프로젝트는 NestJS 서버이므로 Render에서는 `Web Service`가 맞습니다.

### 3-2. Render 설정값

아래처럼 입력하면 됩니다.

- Name: 원하는 서비스명
- Root Directory: `my-news-back`
- Environment: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start:prod`

Prisma 마이그레이션은 배포 전에 적용되도록 `Pre-Deploy Command`를 추가하는 것이 안전합니다.

- Pre-Deploy Command: `npx prisma migrate deploy`

### 3-3. Render 환경 변수

아래 값을 Render Environment Variables에 등록합니다.

```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://프런트-도메인
ENABLE_SWAGGER=false
ENABLE_NEWS_SCHEDULE=true
ENABLE_STARTUP_NEWS_FETCH=false
DATABASE_URL=postgresql://...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
NAVER_NEWS_API_URL=https://openapi.naver.com/v1/search/news.json
OPEN_METEO_API_URL=https://api.open-meteo.com/v1
OPEN_METEO_AIR_QUALITY_API_URL=https://air-quality-api.open-meteo.com/v1
```

주의:

- `CORS_ORIGIN`은 나중에 만들 Vercel 실제 도메인으로 넣어야 합니다.
- 커스텀 도메인까지 붙일 계획이면 쉼표로 여러 개 넣을 수 있습니다.
- 운영에서는 `ENABLE_SWAGGER=false`가 맞습니다.
- 현재 프로젝트는 `PORT` 환경변수를 읽어 서버를 실행하므로 Render 기본 포트 바인딩 방식과 맞습니다.

### 3-4. 배포 후 확인

아래를 확인합니다.

- Render 로그에서 빌드 성공
- `prisma migrate deploy` 성공
- 서비스 URL 접속 성공
- `https://백엔드-도메인/health` 응답 확인

`/health`가 없다면 최소한 뉴스 API 또는 날씨 API 엔드포인트 하나를 직접 호출해서 200 응답을 확인합니다.

### 3-5. 무료 플랜 슬립 방지용 GitHub Actions

Render 무료 플랜은 일정 시간 트래픽이 없으면 슬립될 수 있으므로 GitHub Actions 스케줄로 `/health`를 주기적으로 호출할 수 있습니다.

- 워크플로 파일: `.github/workflows/ping-render.yml`
- 호출 주기: 매시 `3,13,23,33,43,53`분
- 호출 대상: 백엔드 `/health`

설정 방법:

1. GitHub 저장소 `Settings -> Secrets and variables -> Actions`로 이동합니다.
2. `RENDER_HEALTHCHECK_URL` 시크릿을 추가합니다.
3. 값은 `https://백엔드-도메인/health` 형식으로 입력합니다.

예시:

```env
RENDER_HEALTHCHECK_URL=https://my-news-back.onrender.com/health
```

주의:

- GitHub Actions schedule은 지연될 수 있으므로 완전한 실시간 보장은 아닙니다.
- 워크플로가 실패하면 슬립 방지가 끊기므로 Actions 실행 이력을 함께 확인합니다.

## 4. Vercel에 프런트 배포

### 4-1. 프로젝트 생성

1. Vercel 대시보드에서 `Add New...` -> `Project`를 선택합니다.
2. 같은 GitHub 저장소를 Import 합니다.
3. `Root Directory`를 `my-news-front`로 지정합니다.
4. Framework Preset은 Next.js로 두면 됩니다.

### 4-2. Vercel 환경 변수

이 프로젝트는 Next.js rewrite로 `/api/*` 요청을 Render 백엔드로 프록시합니다.

`my-news-front/next.config.ts` 기준 필수 값은 아래 2개입니다.

```env
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_BASE_URL=https://백엔드-도메인
```

설명:

- `NEXT_PUBLIC_API_BASE_URL=/api`
  프런트 코드가 브라우저에서 `/api`로 요청하게 만듭니다.
- `BACKEND_BASE_URL=https://백엔드-도메인`
  Vercel이 `/api/*`를 Render 백엔드로 rewrite 할 때 사용합니다.

### 4-3. 빌드/배포

보통 Vercel이 Next.js를 자동 인식하므로 별도 명령 수정 없이 진행해도 됩니다.

기본값이 꼬이면 아래처럼 맞춥니다.

- Root Directory: `my-news-front`
- Install Command: `npm install`
- Build Command: `npm run build`

배포 후 발급된 Vercel 도메인을 확보합니다.

## 5. CORS 최종 반영

Vercel 도메인이 정해지면 Render의 `CORS_ORIGIN` 값을 최종 반영합니다.

예시:

```env
CORS_ORIGIN=https://my-news-front.vercel.app
```

커스텀 도메인도 함께 허용하려면:

```env
CORS_ORIGIN=https://my-news-front.vercel.app,https://news.example.com
```

값 수정 후 Render를 다시 배포합니다.

## 6. 최종 점검

배포 후 아래를 확인합니다.

- Vercel 첫 화면 정상 표시
- 뉴스 목록 조회 정상 동작
- 뉴스 상세 조회 정상 동작
- 날씨 화면 정상 동작
- 브라우저 콘솔에 CORS 오류 없음
- Render 로그에 Naver API 오류가 없는지 확인
- Prisma 마이그레이션 누락 없음

## 7. 이 프로젝트 기준 권장 운영 흐름

1. 로컬에서 Prisma 마이그레이션 생성
2. 마이그레이션 파일 커밋
3. 운영 브랜치 push
4. Render에서 `prisma migrate deploy` 적용 후 백엔드 배포
5. Vercel 프런트 배포
6. Render `CORS_ORIGIN` 최종 확인

## 8. 자주 막히는 지점

### Render에서 부팅 실패

주요 원인:

- `DATABASE_URL` 오입력
- Prisma 마이그레이션 미적용
- Start Command 오입력

### Vercel에서 API 호출 실패

주요 원인:

- `BACKEND_BASE_URL`에 Render 주소를 잘못 입력
- Render `CORS_ORIGIN`에 Vercel 도메인을 넣지 않음
- Render 백엔드가 아직 Live 상태가 아님

### Vercel에서 `lightningcss` 모듈 로딩 실패

주요 증상:

- `Require stack: ... node_modules/lightningcss/node/index.js`
- `next build` 단계에서 CSS 처리 중 실패

대응:

- `my-news-front/package.json`에 `lightningcss`를 직접 dependency로 명시합니다.
- Linux 빌드 환경용 `lightningcss-linux-x64-gnu`를 `optionalDependencies`에 명시합니다.
- Linux 빌드 환경용 `@tailwindcss/oxide-linux-x64-gnu`도 `optionalDependencies`에 명시합니다.
- Vercel `Install Command`는 기본값 `npm install`로 두고 다시 배포합니다.

### Neon 연결 실패

주요 원인:

- pooled URL이 아니라 Direct URL이 필요한데 잘못 복사함
- SSL 파라미터 누락

## 9. 참고

- Render Docs: https://render.com/docs/your-first-deploy
- Vercel Docs: https://vercel.com/docs/monorepos
- Vercel Environment Variables: https://vercel.com/docs/environment-variables/system-environment-variables
- Prisma Migrate Deploy: https://docs.prisma.io/docs/cli/migrate/deploy
