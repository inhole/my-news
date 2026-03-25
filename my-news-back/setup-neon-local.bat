@echo off
setlocal

echo [1/5] .env 확인
if not exist .env (
  copy .env.local.example .env > nul
  echo .env 파일을 생성했습니다: my-news-back\.env
  echo Neon DATABASE_URL 값을 먼저 입력해 주세요.
  exit /b 1
)

echo [2/5] 의존성 설치
call npm.cmd install
if errorlevel 1 exit /b 1

echo [3/5] Prisma Client 생성
call npm.cmd run db:generate
if errorlevel 1 exit /b 1

echo [4/5] 마이그레이션 적용
call npm.cmd run db:migrate:deploy
if errorlevel 1 exit /b 1

echo [5/5] 카테고리 시드 데이터 입력
call npm.cmd run prisma:seed
if errorlevel 1 exit /b 1

echo.
echo 설정 완료. 로컬 서버 실행:
echo npm.cmd run start:dev
