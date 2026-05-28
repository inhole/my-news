---
name: docs-env-sync
description: my-news 저장소의 문서, 환경 변수 예시, 로컬/운영 실행 방법, Render/Vercel 배포 문서, Neon/Prisma DB 설정 문서를 코드와 동기화할 때 사용한다. 설정 변경, 포트 변경, env 추가, 배포 절차 변경, README/docs 정리가 필요한 작업에 사용한다.
---

# Docs Env Sync

코드, 설정, 문서가 서로 어긋나지 않게 맞출 때 이 스킬을 사용한다. 특히 환경 변수, 실행 명령, 포트, 배포 대상, DB 초기화 절차를 함께 확인한다.

## 확인 대상

- 루트 `package.json`
- `my-news-front/package.json`
- `my-news-back/package.json`
- `my-news-front/.env.local.example`
- `my-news-front/.env.production.example`
- `my-news-back/.env.local.example`
- `my-news-back/.env.production.example`
- `docs/환경-설정.md`
- `docs/로컬-DB-설정.md`
- `docs/render-vercel-배포.md`
- `docs/배포-체크리스트.md`
- `README.md`

## 기본 원칙

- 실제 비밀값은 문서나 예시 파일에 쓰지 않는다.
- 예시는 `your-value`, `example.com`, `postgresql://...`처럼 명확한 플레이스홀더로 둔다.
- 로컬과 운영 환경을 섞지 않는다.
- 실행 명령은 실제 `package.json` 스크립트와 일치시킨다.
- 포트, API base URL, CORS origin은 프론트/백엔드 문서에서 서로 맞춘다.
- DB 설명은 Neon PostgreSQL + Prisma 기준으로 유지한다.

## 작업 흐름

1. 변경된 코드나 설정에서 문서에 반영해야 할 항목을 찾는다.
2. 관련 `.env.*.example`과 문서를 함께 비교한다.
3. 문서의 명령, 포트, 파일명, 환경 변수명이 실제 파일과 일치하도록 수정한다.
4. 배포 관련 변경이면 Render/Vercel 문서와 배포 체크리스트를 함께 확인한다.
5. DB 관련 변경이면 로컬 DB 설정 문서와 Prisma 명령을 확인한다.
6. 최종 응답에 어떤 문서를 왜 바꿨는지 정리한다.

## 자주 확인할 명령

```bash
npm run dev:front
npm run dev:back
npm run build
npm run lint
npm run test
```

## 최종 응답

갱신한 문서, 맞춘 환경 변수/명령/포트, 확인하지 못한 운영 값이나 비밀값을 짧게 정리한다.
