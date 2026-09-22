# 실행 전 확인 규칙

이 파일은 이 저장소에서 작업할 때 먼저 확인하는 전역 지침입니다. 세부 작업 절차는 `agents/*/SKILL.md`에 두고, 이 파일에는 중복되지 않는 공통 규칙과 스킬 선택 기준만 유지합니다.

## 저장소 구조

- `my-news-front`: Next.js 16, React 19, Tailwind CSS 4 기반 프론트엔드
- `my-news-back`: NestJS, Prisma 7, Neon PostgreSQL 기반 백엔드
- `docs`: 기능, 환경, 배포, DB 설정 문서
- `agents`: 반복 작업에 사용할 단일 파일 스킬 모음

## 스킬 선택 기준

작업 성격이 아래 항목과 맞으면 해당 `SKILL.md`를 먼저 읽고 따른다.

- `agents/next-toss-ui/SKILL.md`: Next.js 프론트엔드 UI, 토스 디자인 톤, 반응형/CSS 충돌 검증
- `agents/nest-prisma-api/SKILL.md`: NestJS API, Prisma/Neon DB, 백엔드 서비스/DTO/마이그레이션 작업
- `agents/docs-env-sync/SKILL.md`: 환경 변수, 실행 명령, 배포/DB 문서 동기화
- `agents/review-my-news/SKILL.md`: 저장소 변경 사항 코드 리뷰와 회귀/보안/DB/UI 위험 점검

여러 스킬이 동시에 맞으면 가장 직접적인 스킬을 먼저 읽고, 필요한 경우에만 추가 스킬을 읽는다.

## 필수 원칙

1. 모든 파일은 UTF-8 인코딩으로 작성/수정한다.
2. 변경은 요청 범위 안에서 작게 유지하고, 관련 없는 리팩터링은 분리한다.
3. 기존 사용자 변경 사항을 되돌리지 않는다.
4. 기능, 설정, 실행 방식, DB 구조, 배포 방식이 바뀌면 관련 문서를 함께 업데이트한다.
5. DB 기본 구성은 Neon PostgreSQL + Prisma를 기준으로 한다.
6. `.env`, `.env.local`, `.env.production`의 실제 비밀값은 커밋하거나 문서에 노출하지 않는다.
7. 커밋 전에는 변경 목적, 검증 결과, 문서 반영 여부를 확인한다.

## 기본 작업 흐름

1. 요청과 관련된 파일, 스크립트, 문서를 먼저 확인한다.
2. 필요한 스킬이 있으면 해당 `SKILL.md`를 읽고 세부 규칙을 따른다.
3. 가능한 가장 작은 변경으로 구현한다.
4. 작업 범위에 맞는 가장 좁은 검증을 실행한다.
5. 검증을 실행하지 못하면 이유와 다음으로 좋은 확인 방법을 남긴다.

## 공통 검증 명령

세부 검증 기준은 각 스킬을 우선한다. 전체 확인이 필요할 때는 아래 명령을 사용한다.

```bash
npm run lint
npm run test
npm run build
```

## 커밋 메시지 규칙

1. 커밋 메시지는 한글로 작성한다.
2. 커밋 제목은 `타입: 설명` 형식을 사용한다.
3. 타입은 Conventional Commits 스타일을 따른다.
4. 기본 타입은 `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`만 사용한다.
5. 제목은 무엇을 변경했는지 바로 이해되도록 1줄로 간결하게 작성한다.

예시:

- `feat: 뉴스 상세 화면 공유 기능 추가`
- `fix: 카테고리 필터 중복 선택 오류 수정`
- `chore: 사용하지 않는 도커 설정 파일 삭제`
