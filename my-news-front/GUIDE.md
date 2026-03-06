# My News 사용 가이드

## 개발 환경 설정

### 1. 사전 요구사항
- Node.js 18.0 이상
- npm 또는 yarn
- 백엔드 API 서버 (Nest.js)

### 2. 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일 생성:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

### 4. 개발 서버 실행
```bash
npm run dev
```

## 주요 기능 사용법

### 홈 페이지 (/)
- 카테고리 탭을 클릭하여 뉴스 필터링
- 스크롤하면 자동으로 다음 페이지 로드
- 날씨 위젯은 자동으로 현재 위치 감지

### 뉴스 상세 페이지 (/news/[id])
- 뉴스 카드 클릭시 상세 페이지로 이동
- 북마크 버튼으로 저장/해제
- 공유 버튼으로 링크 공유

### 로그인 (/login)
- 이메일과 비밀번호 입력
- 로그인 성공시 홈으로 리다이렉트
- 쿠키 기반 세션 유지

### 북마크 (/bookmarks)
- 로그인 필요
- 저장한 뉴스 목록 확인
- 무한 스크롤 지원

## API 연동 가이드

### 응답 형식

#### 뉴스 목록
```typescript
{
  items: News[];
  nextCursor?: string;
  hasMore: boolean;
}
```

#### News 객체
```typescript
{
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  category: string;
  source: string;
  publishedAt: string;
  isBookmarked?: boolean;
}
```

### 인증
- HttpOnly 쿠키 자동 처리
- 401 응답시 자동 로그인 페이지 이동

## 트러블슈팅

### 날씨가 표시되지 않음
- 브라우저 위치 권한 확인
- HTTPS 또는 localhost 환경 확인

### 로그인이 안됨
- 백엔드 API 서버 실행 확인
- CORS 설정 확인
- 쿠키 설정 확인 (withCredentials)

### 이미지가 표시되지 않음
- next.config.ts의 remotePatterns 확인
- 이미지 URL이 유효한지 확인

## 커스터마이징

### 카테고리 추가
`components/news/category-tabs.tsx` 수정

### 테마 변경
`app/globals.css` 및 Tailwind 클래스 수정

### API URL 변경
`.env.local` 파일 수정
