# My News Back

나만의 관심 뉴스 카테고리 백엔드 - 모바일 뉴스 앱용 REST API

## 기술 스택

- **프레임워크**: NestJS + TypeScript
- **데이터베이스**: PostgreSQL + Prisma ORM
- **인증**: JWT (Access/Refresh Token) with HttpOnly Cookie
- **외부 API**: NewsAPI (뉴스), Open‑Meteo (날씨, 무료/키 불필요)
- **컨테이너**: Docker + Docker Compose

## 주요 기능

### 인증 (Authentication)
- 회원가입/로그인
- JWT Access Token (15분)
- JWT Refresh Token (7일, HttpOnly Cookie)
- 자동 토큰 갱신

### 뉴스 (News)
- 외부 뉴스 API 연동 및 DB 캐싱
- **자동 배치 작업**: 매시간 자동으로 최신 뉴스 수집
- **스케줄 업데이트**: 하루 2회 (오전 6시, 오후 6시) 주요 카테고리 우선 업데이트
- 뉴스 목록 조회 (커서 기반 무한 스크롤)
- 뉴스 상세 조회
- 카테고리별 뉴스 필터링
- 뉴스 검색
- 카테고리 목록 조회
- 수동 뉴스 수집 트리거 (관리자)

### 북마크 (Bookmarks)
- 뉴스 북마크 추가
- 북마크 삭제
- 내 북마크 목록 조회

### 날씨 (Weather)
- 위도/경도 기반 현재 날씨 조회
- 10분 좌표 캐싱 (rate limit 보호)
- Open‑Meteo API 연동 (무료/키 불필요)

### 공통
- 전역 에러 처리
- 요청/응답 로깅
- Rate Limiting (100 req/60s)
- CORS 설정
- DTO 자동 검증

## 시작하기

### 사전 요구사항

- Node.js 18+
- Docker & Docker Compose
- NewsAPI Key (https://newsapi.org/)
- (선택) Open‑Meteo 사용 시 별도 API Key 불필요 (https://open-meteo.com/)

### 설치

1. 저장소 클론
```bash
git clone https://github.com/inhole/my-news-back.git
cd my-news-back
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일을 열어 다음 값들을 설정하세요:
```env
DATABASE_URL="postgresql://mynews:mynews@localhost:5432/mynews?schema=public"

JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

NEWS_API_KEY="your-newsapi-key"

## Weather (Open‑Meteo)
## Open‑Meteo는 기본적으로 API Key가 필요 없습니다.
OPEN_METEO_API_URL="https://api.open-meteo.com/v1"

PORT=3000
NODE_ENV="development"

CORS_ORIGIN="http://localhost:3001"
```

### Docker로 실행

1. PostgreSQL 시작
```bash
docker compose up -d postgres
```

2. 데이터베이스 마이그레이션
```bash
npx prisma migrate dev --name init
```

3. 전체 서비스 시작
```bash
docker-compose up -d
```

### 로컬 개발 환경

1. PostgreSQL 시작 (Docker)
```bash
docker-compose up -d postgres
```

2. Prisma 마이그레이션
```bash
npx prisma migrate dev
```

3. Prisma Client 생성
```bash
npx prisma generate
```

4. 개발 서버 시작
```bash
npm run start:dev
```

서버가 http://localhost:3000 에서 실행됩니다.

## API 엔드포인트

### 인증

#### POST /auth/register
회원가입
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

#### POST /auth/login
로그인
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /auth/refresh
토큰 갱신 (Refresh Token 필요)

#### POST /auth/logout
로그아웃 (Refresh Token 필요)

### 뉴스

#### GET /news
뉴스 목록 조회
- Query Parameters:
  - `cursor`: 커서 (optional)
  - `limit`: 페이지 크기 (default: 20)
  - `category`: 카테고리 필터 (optional)
  - `search`: 검색어 (optional)

#### GET /news/:id
뉴스 상세 조회

#### GET /news/categories
카테고리 목록

#### GET /news/category/:category
카테고리별 뉴스
- Query Parameters:
  - `cursor`: 커서 (optional)
  - `limit`: 페이지 크기 (default: 20)

#### GET /news/search
뉴스 검색
- Query Parameters:
  - `search`: 검색어 (required)
  - `cursor`: 커서 (optional)
  - `limit`: 페이지 크기 (default: 20)

#### POST /news/fetch (인증 필요)
외부 API에서 뉴스 가져오기 (수동 트리거)
- Query Parameters:
  - `category`: 카테고리 (optional) - 지정하지 않으면 모든 카테고리 수집
- **배치 작업**: 자동으로 매시간 정각에 실행되며, 오전 6시/오후 6시에 주요 업데이트
- 상세 정보는 [NEWS_BATCH.md](NEWS_BATCH.md) 참조

### 북마크 (인증 필요)

#### GET /bookmarks
내 북마크 목록
- Query Parameters:
  - `cursor`: 커서 (optional)
  - `limit`: 페이지 크기 (default: 20)

#### POST /bookmarks
북마크 추가
```json
{
  "newsId": "uuid"
}
```

#### DELETE /bookmarks/:id
북마크 삭제

### 날씨

#### GET /weather
현재 위치 날씨
- Query Parameters:
  - `lat`: 위도 (required)
  - `lon`: 경도 (required)

#### GET /weather/clean-cache
만료된 캐시 정리

## 데이터베이스 스키마

### User
- id (UUID)
- email (unique)
- password (hashed)
- name
- refreshToken
- timestamps

### News
- id (UUID)
- title
- description
- content
- url (unique)
- urlToImage
- publishedAt
- source
- author
- categoryId
- timestamps

### Category
- id (UUID)
- name (unique)
- slug (unique)
- description
- timestamps

### Bookmark
- id (UUID)
- userId
- newsId
- createdAt
- unique(userId, newsId)

### WeatherCache
- id (UUID)
- lat
- lon
- data (JSON)
- expiresAt
- unique(lat, lon)

## 개발 스크립트

```bash
# 개발 서버
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod

# 테스트
npm run test
npm run test:e2e

# 린트
npm run lint

# Prisma
npx prisma studio          # DB GUI
npx prisma migrate dev     # 마이그레이션 생성 및 적용
npx prisma generate        # Client 생성
```

## 배치 작업 (Batch Jobs)

### 자동 뉴스 수집
애플리케이션이 실행되면 자동으로 다음 스케줄에 따라 뉴스를 수집합니다:

- **매시간 정각**: 모든 카테고리의 최신 뉴스 수집
- **오전 6시, 오후 6시**: 주요 카테고리(general, technology, business) 우선 업데이트

### 수동 트리거
관리자 계정으로 로그인 후 다음 API를 통해 수동으로 뉴스를 수집할 수 있습니다:

```bash
# 모든 카테고리 수집
curl -X POST http://localhost:3000/news/fetch \
  -H "Authorization: Bearer {access_token}"

# 특정 카테고리만 수집
curl -X POST "http://localhost:3000/news/fetch?category=technology" \
  -H "Authorization: Bearer {access_token}"
```

**참고**: NewsAPI 무료 플랜은 하루 100회 요청 제한이 있으므로 주의하세요.

상세한 배치 작업 정보는 [NEWS_BATCH.md](NEWS_BATCH.md)를 참조하세요.

## 프로젝트 구조

```
src/
├── auth/              # 인증 모듈
│   ├── dto/
│   ├── guards/
│   └── strategies/
├── news/              # 뉴스 모듈
│   ├── dto/
│   ├── news.service.ts
│   ├── news-batch.service.ts  # 배치 작업
│   └── news.controller.ts
├── bookmark/          # 북마크 모듈
│   └── dto/
├── weather/           # 날씨 모듈
│   └── dto/
├── prisma/            # Prisma 서비스
├── common/            # 공통 유틸리티
│   ├── decorators/
│   ├── filters/
│   └── interceptors/
├── app.module.ts
└── main.ts
```

## 보안

- 비밀번호는 bcrypt로 해시 처리
- JWT Access Token: Bearer 인증
- JWT Refresh Token: HttpOnly Cookie
- Rate Limiting: 60초당 100 요청
- CORS 설정
- DTO 자동 검증

## 라이선스

MIT

## 문의

이슈나 질문이 있으시면 GitHub Issues를 이용해 주세요.
