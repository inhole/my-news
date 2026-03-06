# my-news (Monorepo)

뉴스 탐색/북마크 서비스를 **하나의 Git 저장소 + npm workspaces 모노레포**로 통합 관리하도록 정리했습니다.

## 1) 프로젝트 구조

```text
my-news/
├─ my-news-front/   # Next.js 16 (웹)
├─ my-news-back/    # NestJS 11 + Prisma (API)
├─ package.json     # 루트 워크스페이스 스크립트
└─ README.md        # 통합 문서 (이 파일)
```

## 2) 기술 스택 (통합 정리)

### Frontend
- Next.js 16
- React 19
- TypeScript 5
- TanStack Query
- Axios
- Tailwind CSS 4

### Backend
- NestJS 11
- Prisma ORM
- PostgreSQL
- JWT/Auth (Passport)
- Swagger (OpenAPI)

### Infra / DevOps
- npm workspaces (모노레포)
- Docker Compose (로컬 Postgres)

## 3) 모노레포 실행 방법

### 설치
```bash
npm run install:all
```

### 개발 서버
```bash
# 프론트
npm run dev:front

# 백엔드
npm run dev:back
```

### 품질 체크 / 빌드
```bash
npm run lint
npm run build
npm run test
```

## 4) 환경변수

### Frontend (`my-news-front/.env.example`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

### Backend (`my-news-back/.env.example`)
- 필수: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEWS_API_KEY`
- 템플릿은 `my-news-back/.env.example` 참고

## 5) DB를 무료로 운영하기

Prisma datasource는 PostgreSQL 기반이므로, 아래 무료 요금제를 바로 사용할 수 있습니다.

- **Supabase Free**: Postgres + 대시보드 편의성
- **Neon Free**: 서버리스 Postgres, 분기/복원 기능 유리
- (로컬 개발) Docker Compose Postgres

적용 방법:
1. 무료 DB 생성
2. 연결 문자열을 `my-news-back/.env`의 `DATABASE_URL`에 설정
3. 마이그레이션 실행

```bash
cd my-news-back
npx prisma migrate deploy
npx prisma generate
```

## 6) 클라우드를 무료로 운영하기 (권장 조합)

- **Frontend**: Vercel (Free)
- **Backend**: Render / Railway / Fly.io 중 Free 플랜 선택
- **Database**: Supabase 또는 Neon Free

권장 배포 흐름:
1. DB 먼저 생성 후 `DATABASE_URL` 확보
2. 백엔드 배포(환경변수 세팅)
3. 프론트 배포 후 `NEXT_PUBLIC_API_BASE_URL`을 백엔드 URL로 변경
4. CORS(`CORS_ORIGIN`)를 프론트 URL로 설정

## 7) Git 운영 원칙 (통합)

- 프론트/백을 **분리 저장소로 나누지 않고**, 이 저장소 하나에서 함께 관리
- 루트 기준 브랜치 전략 사용 (`feature/*`, `fix/*`)
- PR에서 front/back 변경을 한 번에 추적 가능

---
필요하면 다음 단계로 Turborepo/Nx를 추가해 캐시 빌드와 병렬 파이프라인까지 확장할 수 있습니다.
