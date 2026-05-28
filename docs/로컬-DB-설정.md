# DB 설정

개발에서는 Neon PostgreSQL Direct URL을 사용합니다.

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

## 스키마 변경 후 마이그레이션

테이블 추가/수정 후:

### 개발 환경 (권장)
```bash
npm run db:migrate:dev
```
- 마이그레이션 파일 자동 생성
- 데이터베이스에 변경 적용
- Prisma Client 업데이트
- 변경 이력 관리 가능

### 빠른 테스트 (마이그레이션 파일 불필요)
```bash
npm run db:push
```
- 마이그레이션 파일 없이 즉시 적용
- 실험용으로만 사용
- 배포 전에는 `db:migrate:dev`로 파일 생성 필요

### 운영 배포
```bash
npm run db:migrate:deploy
```
- 생성된 마이그레이션 파일을 운영 DB에 적용
- Neon PostgreSQL에 배포할 때 사용

## 참고 명령

- `npm run db:generate` - Prisma Client 재생성 (선택, 대부분 자동)
- `npm run db:migrate:dev` - 개발용 마이그레이션 생성/실행 (권장)
- `npm run db:migrate:deploy` - 운영용 마이그레이션 배포
- `npm run db:push` - 마이그레이션 파일 없이 즉시 적용 (테스트용)
