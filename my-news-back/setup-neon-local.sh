#!/bin/bash

set -e

echo "[1/5] .env 확인"
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env 파일을 생성했습니다: my-news-back/.env"
  echo "Neon DATABASE_URL 값을 먼저 입력해 주세요."
  exit 1
fi

echo "[2/5] 의존성 설치"
npm install

echo "[3/5] Prisma Client 생성"
npm run db:generate

echo "[4/5] 마이그레이션 적용"
npm run db:migrate:deploy

echo "[5/5] 카테고리 시드 데이터 입력"
npm run prisma:seed

echo ""
echo "설정 완료. 로컬 서버 실행:"
echo "npm run start:dev"
