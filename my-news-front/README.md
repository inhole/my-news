# My News - 나만의 뉴스 앱

React + Next.js(App Router, TypeScript)로 구축된 모바일 우선 뉴스 애플리케이션

## 🚀 주요 기능

- **홈**: 카테고리 탭 기반 뉴스 피드 + 무한 스크롤 (cursor 기반 페이징)
- **뉴스 검색**: 키워드 기반 뉴스 검색 + 무한 스크롤
- **뉴스 상세**: 전체 기사 내용, 이미지, 북마크, 공유 기능
- **회원가입/로그인**: HttpOnly 쿠키 기반 인증
- **북마크**: 저장한 뉴스 관리 (추가/삭제)
- **날씨**: 현재 위치 기반 날씨 정보 표시 (헤더 위젯)

## 🛠 기술 스택

- **Frontend**: React 19, Next.js 16 (App Router), TypeScript 5
- **Styling**: Tailwind CSS 4
- **Data Fetching**: TanStack Query (React Query) v5
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Backend**: Nest.js REST API (별도 서버 필요)

## 📦 설치 및 실행

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3001](http://localhost:3001) 접속

### 4. 프로덕션 빌드

```bash
npm run build
npm start
```

## 📂 프로젝트 구조

```
my-news-front/
├── app/                      # Next.js App Router 페이지
│   ├── bookmarks/           # 북마크 페이지
│   ├── login/               # 로그인 페이지
│   ├── news/[id]/           # 뉴스 상세 페이지
│   ├── layout.tsx           # 루트 레이아웃
│   └── page.tsx             # 홈 페이지
├── components/              # 재사용 가능한 컴포넌트
│   ├── layout/              # 레이아웃 컴포넌트
│   │   ├── header.tsx       # 헤더 컴포넌트
│   │   └── weather-widget.tsx  # 날씨 위젯
│   ├── news/                # 뉴스 관련 컴포넌트
│   │   ├── category-tabs.tsx   # 카테고리 탭
│   │   ├── news-card.tsx       # 뉴스 카드
│   │   └── news-list.tsx       # 뉴스 목록
│   ├── providers/           # Context Providers
│   │   └── query-provider.tsx  # React Query Provider
│   └── ui/                  # UI 컴포넌트
│       ├── empty.tsx        # 빈 상태 UI
│       ├── error.tsx        # 에러 UI
│       └── loading.tsx      # 로딩 UI
├── hooks/                   # 커스텀 React Hooks
│   ├── use-auth.ts          # 인증 hooks
│   ├── use-bookmarks.ts     # 북마크 hooks
│   ├── use-news.ts          # 뉴스 hooks
│   ├── use-queries.ts       # Hooks 통합 인덱스
│   └── use-weather.ts       # 날씨 hooks
├── lib/                     # 유틸리티 및 API 클라이언트
│   ├── api-client.ts        # Axios 인스턴스
│   ├── api.ts               # API 함수 (레거시)
│   └── api/                 # API 함수 (도메인별 분리)
│       ├── auth.ts          # 인증 API
│       ├── bookmarks.ts     # 북마크 API
│       ├── error-handler.ts # 에러 핸들러
│       ├── news.ts          # 뉴스 API
│       └── weather.ts       # 날씨 API
└── types/                   # TypeScript 타입 정의 (도메인별 분리)
    ├── index.ts             # 타입 re-export
    ├── auth.ts              # 인증 관련 타입
    ├── category.ts          # 카테고리 타입
    ├── news.ts              # 뉴스 관련 타입
    ├── bookmark.ts          # 북마크 관련 타입
    ├── weather.ts           # 날씨 관련 타입
    └── common.ts            # 공통 타입 (Pagination, Error)
```

## 🔌 백엔드 API 요구사항

이 프론트엔드는 다음 API 엔드포인트가 필요합니다:

### 뉴스 API
- `GET /api/news?category={category}&cursor={cursor}&limit={limit}` - 뉴스 목록 (무한 스크롤)
- `GET /api/news/search?q={query}&cursor={cursor}&limit={limit}` - 뉴스 검색
- `GET /api/news/categories` - 카테고리 목록
- `GET /api/news/:id` - 뉴스 상세

### 북마크 API
- `GET /api/bookmarks?cursor={cursor}&limit={limit}` - 북마크 목록 (무한 스크롤)
- `POST /api/bookmarks` - 북마크 추가 (body: `{ newsId: number }`)
- `DELETE /api/bookmarks/:newsId` - 북마크 삭제

### 인증 API
- `POST /api/auth/register` - 회원가입 (body: `{ email, password, name }`)
- `POST /api/auth/login` - 로그인 (body: `{ email, password }`)
- `POST /api/auth/logout` - 로그아웃

### 날씨 API
- `GET /api/weather?lat={lat}&lon={lon}` - 위치 기반 날씨 정보

## 🎨 UI/UX 특징

- **모바일 우선 반응형 디자인**
- **로딩/에러/빈 상태 UI** 완벽 구현
- **무한 스크롤** (Intersection Observer)
- **낙관적 업데이트** (북마크)
- **자동 캐싱 및 재검증** (TanStack Query)

## 🔐 인증

HttpOnly 쿠키를 사용한 안전한 인증 방식:
- 쿠키는 서버에서 자동으로 관리
- XSS 공격으로부터 보호
- `withCredentials: true`로 자동 쿠키 전송

## 📱 카테고리

- 전체
- 정치
- 경제
- 사회
- 문화
- 기술
- 스포츠

## 🌐 브라우저 지원

- Chrome (최신)
- Firefox (최신)
- Safari (최신)
- Edge (최신)

## 📝 개발 가이드

### 프로젝트 아키텍처

- **도메인 기반 구조**: API, Hooks, Components, Types를 도메인별로 분리
- **TanStack Query**: 서버 상태 관리 및 캐싱
- **Optimistic Updates**: 북마크 등 사용자 경험 개선
- **Infinite Scroll**: Cursor 기반 페이지네이션
- **Error Handling**: 통합 에러 핸들러로 일관된 에러 처리

### Import 경로 규칙

프로젝트 전체에서 `@` 절대경로를 사용합니다:

```typescript
// ✅ 좋은 예 (절대경로)
import { News } from '@/types';
import { newsApi } from '@/lib/api';
import { useInfiniteNews } from '@/hooks/use-queries';
import { NewsCard } from '@/components/news/news-card';

// ❌ 나쁜 예 (상대경로 - types 폴더 내부 제외)
import { News } from '../../types';
import { newsApi } from '../lib/api';
```

**예외**: `types/` 폴더 내부에서는 상대경로 사용
```typescript
// types/news.ts
import type { Category } from './category'; // ✅ 같은 폴더 내에서는 상대경로
```

### 타입 구조

타입은 도메인별로 분리되어 있으며, `types/index.ts`에서 통합 export:

- **auth.ts**: User, LoginRequest, RegisterRequest, AuthResponse
- **category.ts**: Category
- **news.ts**: News, NewsListResponse
- **bookmark.ts**: Bookmark, BookmarksListResponse
- **weather.ts**: Weather
- **common.ts**: PaginatedResponse<T>, ErrorResponse

### 주요 Hooks

#### 뉴스 관련
- `useInfiniteNews`: 전체 뉴스 무한 스크롤
- `useInfiniteNewsByCategory`: 카테고리별 뉴스 무한 스크롤
- `useInfiniteSearchNews`: 검색 결과 무한 스크롤
- `useNewsDetail`: 뉴스 상세 정보
- `useCategories`: 카테고리 목록

#### 북마크 관련
- `useInfiniteBookmarks`: 북마크 목록 무한 스크롤
- `useAddBookmark`: 북마크 추가
- `useRemoveBookmark`: 북마크 삭제

#### 인증 관련
- `useRegister`: 회원가입
- `useLogin`: 로그인
- `useLogout`: 로그아웃

#### 날씨 관련
- `useWeather`: 위치 기반 날씨 정보

## 📄 라이선스

MIT

## 👥 개발자

시니어 프론트엔드 개발자

