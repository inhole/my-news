---
name: nest-prisma-api
description: my-news-back의 NestJS API, 서비스, DTO, 인증, 스케줄러, 외부 뉴스 API 연동, Prisma 스키마와 Neon PostgreSQL 데이터 흐름을 만들거나 수정할 때 사용한다. 백엔드 기능 추가, 버그 수정, DB/Prisma 변경, 마이그레이션/시드/환경 변수 점검이 필요한 작업에 사용한다.
---

# Nest Prisma API

`my-news-back`의 백엔드 기능을 구현하거나 수정할 때 이 스킬을 사용한다. NestJS 모듈 경계와 Prisma 데이터 모델을 유지하면서 작고 검증 가능한 변경을 만든다.

## 기본 방향

- 컨트롤러는 요청/응답 경계, DTO 검증, 라우팅에 집중한다.
- 서비스는 비즈니스 로직과 Prisma 접근을 담당한다.
- DTO는 입력 검증과 API 계약을 명확히 표현한다.
- Prisma 스키마 변경은 기존 데이터와 운영 DB 영향을 먼저 고려한다.
- 외부 API, 스케줄러, 뉴스 수집 로직은 실패, 타임아웃, 재시도, 로깅 기준을 함께 확인한다.
- 인증, 쿠키, CORS, JWT, 개인정보 관련 변경은 보안 영향을 우선 검토한다.

## 작업 흐름

1. 관련 모듈, 컨트롤러, 서비스, DTO, spec을 찾는다.
2. API 계약이 바뀌면 프론트 호출부와 문서 영향을 함께 확인한다.
3. DB 변경이 있으면 `my-news-back/prisma/schema.prisma`, seed, 마이그레이션 필요 여부를 확인한다.
4. 환경 변수가 추가/변경되면 `.env.*.example`과 `docs/환경-설정.md`를 갱신한다.
5. 동작 변경에는 가능한 spec을 추가하거나 기존 spec을 갱신한다.
6. 관련 검증을 실행하고 결과를 보고한다.

## Prisma/DB 규칙

- 기본 DB는 Neon PostgreSQL로 본다.
- nullable, default, unique, relation, cascade 동작을 명시적으로 검토한다.
- 기존 데이터 손실 가능성이 있으면 최종 응답에 분명히 적는다.
- Prisma Client가 필요한 변경이면 generate 명령을 고려한다.
- 운영 반영이 필요한 변경은 dev migration과 deploy migration을 구분한다.

## 검증

작업 범위에 맞게 좁은 명령부터 실행한다.

```bash
npm run test --workspace my-news-back
npm run lint --workspace my-news-back
npm run build --workspace my-news-back
```

DB 관련 변경 시 필요에 따라 실행한다.

```bash
npm run db:generate --workspace my-news-back
npm run db:migrate:dev --workspace my-news-back
npm run prisma:seed --workspace my-news-back
```

## 최종 응답

변경한 API/서비스/DB 구조, 문서 반영 여부, 검증 명령, 데이터/운영 리스크를 짧게 정리한다.
