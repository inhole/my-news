# 로컬 DB 설정

로컬 개발에서는 Neon PostgreSQL Direct URL을 사용합니다.

## 설정 순서

1. Neon에서 프로젝트와 데이터베이스를 생성합니다.
2. Direct 연결 문자열을 확인합니다.
3. `my-news-back/.env.local.example`을 참고해 `my-news-back/.env`를 작성합니다.
4. `DATABASE_URL`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 입력합니다.

## 초기화

```bash
cd my-news-back
npm install
npm run db:generate
npm run db:migrate:deploy
npm run prisma:seed
npm run start:dev
```

## 참고 명령

- `npm run db:generate`
- `npm run db:migrate:dev`
- `npm run db:migrate:deploy`
- `npm run db:push`
