# 백엔드 로컬 구동 가이드 (Neon + PostgreSQL + Prisma)

이 문서는 `my-news-back`를 로컬에서 실행하고, DB는 Neon PostgreSQL을 사용하는 기준입니다.

## 1. 사전 준비

1. Neon에서 프로젝트와 데이터베이스를 생성합니다.
2. 연결 정보에서 Direct 접속 문자열을 확인합니다.
3. 이 저장소는 현재 Docker 기반 로컬 DB 구성을 사용하지 않습니다.

## 2. 환경변수 설정

1. `my-news-back/.env.example`을 `my-news-back/.env`로 복사합니다.
2. `.env`에서 `DATABASE_URL`을 Neon Direct URL로 교체합니다.
3. `.env`에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 입력합니다.

```env
DATABASE_URL=postgresql://[NEON_USER]:[NEON_PASSWORD]@[NEON_DIRECT_HOST]/[DB_NAME]?sslmode=require&channel_binding=require
```

## 3. DB 초기화 및 실행

`my-news-back` 경로에서 아래 명령을 순서대로 실행합니다.

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run prisma:seed
npm run start:dev
```

## 4. 스크립트 실행(선택)

Windows:

```bat
my-news-back\setup-neon-local.bat
```

macOS/Linux:

```bash
./my-news-back/setup-neon-local.sh
```

## 5. Prisma 명령 참고

- `npm run db:generate`: Prisma Client 생성
- `npm run db:migrate:dev`: 개발용 마이그레이션 생성/적용
- `npm run db:migrate:deploy`: 마이그레이션 적용
- `npm run db:push`: 스키마를 DB에 즉시 반영(마이그레이션 파일 미생성)

## 6. 인코딩 정책

- 모든 코드/문서는 UTF-8로 유지합니다.
- 문서화는 한국어 기준으로 유지합니다.

## 7. Frontend local proxy (mobile-friendly)

For local mobile checks, use these frontend env values:

```env
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_BASE_URL=http://localhost:3000
```

And run frontend on LAN:

```bash
npm run dev:front
```
