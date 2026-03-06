# My News API - 프론트엔드 개발 가이드

## 📚 목차
- [개요](#개요)
- [기본 설정](#기본-설정)
- [인증 (Authentication)](#인증-authentication)
- [뉴스 API](#뉴스-api)
- [북마크 API](#북마크-api)
- [날씨 API](#날씨-api)
- [에러 처리](#에러-처리)

---

## 개요

**Base URL**: `http://localhost:3000`  
**API Documentation**: `http://localhost:3000/api` (Swagger UI)

### 인증 방식
- **Access Token**: Bearer Token (헤더에 포함)
- **Refresh Token**: HttpOnly Cookie (자동 전송)

---

## 기본 설정

### Axios 설정 예시

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // 쿠키 전송을 위해 필수
  headers: {
    'Content-Type': 'application/json',
  },
});

// Access Token 자동 추가 인터셉터
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token 만료 시 자동 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { data } = await axios.post(
          'http://localhost:3000/auth/refresh',
          {},
          { withCredentials: true }
        );
        
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh 실패 시 로그인 페이지로 이동
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### Fetch API 설정 예시

```typescript
const baseURL = 'http://localhost:3000';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`${baseURL}${url}`, {
    ...options,
    credentials: 'include', // 쿠키 전송
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  // Token 만료 시 자동 갱신
  if (response.status === 401 && !options.headers?.['X-Retry']) {
    const refreshResponse = await fetch(`${baseURL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      const { accessToken } = await refreshResponse.json();
      localStorage.setItem('accessToken', accessToken);
      
      // 재시도
      return fetchWithAuth(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Retry': 'true',
        },
      });
    } else {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error('Authentication failed');
    }
  }

  return response;
}
```

---

## 인증 (Authentication)

### 1. 회원가입

**POST** `/auth/register`

```typescript
// Request
interface RegisterRequest {
  email: string;
  password: string; // 최소 6자
  name?: string; // 선택사항
}

// Response
interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  accessToken: string;
}

// 사용 예시
const register = async (email: string, password: string, name?: string) => {
  const { data } = await api.post<RegisterResponse>('/auth/register', {
    email,
    password,
    name,
  });
  
  // Access Token 저장
  localStorage.setItem('accessToken', data.accessToken);
  
  return data.user;
};

// 에러 처리
try {
  await register('user@example.com', 'password123', '홍길동');
} catch (error) {
  if (error.response?.status === 409) {
    console.error('이미 존재하는 이메일입니다.');
  }
}
```

### 2. 로그인

**POST** `/auth/login`

```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
}

// Response (RegisterResponse와 동일)
interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  accessToken: string;
}

// 사용 예시
const login = async (email: string, password: string) => {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  
  localStorage.setItem('accessToken', data.accessToken);
  
  return data.user;
};

// 에러 처리
try {
  await login('user@example.com', 'password123');
} catch (error) {
  if (error.response?.status === 401) {
    console.error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }
}
```

### 3. 토큰 갱신

**POST** `/auth/refresh`

```typescript
// Request: 없음 (Refresh Token은 Cookie로 자동 전송)

// Response
interface RefreshResponse {
  accessToken: string;
}

// 사용 예시
const refreshToken = async () => {
  const { data } = await axios.post<RefreshResponse>(
    'http://localhost:3000/auth/refresh',
    {},
    { withCredentials: true }
  );
  
  localStorage.setItem('accessToken', data.accessToken);
  
  return data.accessToken;
};

// 자동 갱신은 위의 인터셉터에서 처리
```

### 4. 로그아웃

```typescript
// 클라이언트 측에서만 처리
const logout = () => {
  localStorage.removeItem('accessToken');
  // 쿠키는 만료될 때까지 유지되지만, Access Token이 없으면 인증 불가
  window.location.href = '/login';
};
```

---

## 뉴스 API

### 1. 뉴스 목록 조회 (페이지네이션)

**GET** `/news`

```typescript
// Query Parameters
interface GetNewsParams {
  cursor?: string; // 다음 페이지 커서
  limit?: number; // 페이지당 항목 수 (기본값: 20)
  category?: string; // 카테고리 필터 (선택)
  search?: string; // 검색 키워드 (선택)
}

// Response
interface NewsListResponse {
  items: News[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface News {
  id: string;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  source: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

// 사용 예시
const getNews = async (cursor?: string, limit = 20, category?: string, search?: string) => {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  if (limit) params.append('limit', limit.toString());
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  
  const { data } = await api.get<NewsListResponse>(`/news?${params}`);
  return data;
};

// 무한 스크롤 예시
const [news, setNews] = useState<News[]>([]);
const [cursor, setCursor] = useState<string | null>(null);
const [hasMore, setHasMore] = useState(true);

const loadMoreNews = async () => {
  const data = await getNews(cursor || undefined);
  setNews([...news, ...data.items]);
  setCursor(data.nextCursor);
  setHasMore(data.hasMore);
};
```

### 2. 카테고리 목록 조회

**GET** `/news/categories`

```typescript
// Response
interface Category {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  createdAt: string;
}

// 사용 예시
const getCategories = async () => {
  const { data } = await api.get<Category[]>('/news/categories');
  return data;
};

// React 예시
const [categories, setCategories] = useState<Category[]>([]);

useEffect(() => {
  getCategories().then(setCategories);
}, []);
```

### 3. 뉴스 검색

**GET** `/news/search`

```typescript
// Query Parameters (GetNewsParams와 동일)
interface SearchNewsParams {
  search: string; // 필수
  cursor?: string;
  limit?: number;
}

// Response (NewsListResponse와 동일)

// 사용 예시
const searchNews = async (keyword: string, cursor?: string, limit = 20) => {
  const params = new URLSearchParams({
    search: keyword,
    ...(cursor && { cursor }),
    limit: limit.toString(),
  });
  
  const { data } = await api.get<NewsListResponse>(`/news/search?${params}`);
  return data;
};

// 디바운스 검색 예시
import { useDebounce } from 'use-debounce';

const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch] = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    searchNews(debouncedSearch).then(/* ... */);
  }
}, [debouncedSearch]);
```

### 4. 카테고리별 뉴스 조회

**GET** `/news/category/:category`

```typescript
// Path Parameters
// category: 카테고리 slug (예: 'technology', 'sports')

// Query Parameters
interface GetNewsByCategoryParams {
  cursor?: string;
  limit?: number;
}

// Response (NewsListResponse와 동일)

// 사용 예시
const getNewsByCategory = async (
  categorySlug: string,
  cursor?: string,
  limit = 20
) => {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  if (limit) params.append('limit', limit.toString());
  
  const { data } = await api.get<NewsListResponse>(
    `/news/category/${categorySlug}?${params}`
  );
  return data;
};

// React Router 예시
const CategoryPage = () => {
  const { slug } = useParams();
  const [news, setNews] = useState<News[]>([]);
  
  useEffect(() => {
    if (slug) {
      getNewsByCategory(slug).then((data) => setNews(data.items));
    }
  }, [slug]);
  
  // ...
};
```

### 5. 뉴스 상세 조회

**GET** `/news/:id`

```typescript
// Path Parameters
// id: 뉴스 ID (UUID)

// Response
interface NewsDetail {
  id: string;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  source: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
}

// 사용 예시
const getNewsById = async (id: string) => {
  const { data } = await api.get<NewsDetail>(`/news/${id}`);
  return data;
};

// React 예시
const NewsDetailPage = () => {
  const { id } = useParams();
  const [news, setNews] = useState<NewsDetail | null>(null);
  
  useEffect(() => {
    if (id) {
      getNewsById(id).then(setNews);
    }
  }, [id]);
  
  if (!news) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{news.title}</h1>
      {news.imageUrl && <img src={news.imageUrl} alt={news.title} />}
      <p>{news.description}</p>
      <a href={news.url} target="_blank" rel="noopener noreferrer">
        원문 보기
      </a>
    </div>
  );
};
```

### 6. 외부 API에서 뉴스 가져오기 (관리자용)

**POST** `/news/fetch` 🔒 **인증 필요**

```typescript
// Query Parameters
interface FetchNewsParams {
  category?: string; // 선택사항 (없으면 모든 카테고리)
}

// Response
interface FetchNewsResponse {
  message: string;
  count?: number;
  category?: string;
  note?: string;
}

// 사용 예시
const fetchNews = async (category?: string) => {
  const params = category ? `?category=${category}` : '';
  const { data } = await api.post<FetchNewsResponse>(`/news/fetch${params}`);
  return data;
};

// 관리자 페이지에서 사용
const handleFetchNews = async () => {
  try {
    const result = await fetchNews('technology');
    alert(result.message);
  } catch (error) {
    if (error.response?.status === 401) {
      alert('인증이 필요합니다.');
    }
  }
};
```

---

## 북마크 API

**모든 북마크 API는 인증이 필요합니다** 🔒

### 1. 북마크 추가

**POST** `/bookmarks` 🔒

```typescript
// Request
interface CreateBookmarkRequest {
  newsId: string; // 북마크할 뉴스 ID
}

// Response
interface Bookmark {
  id: string;
  userId: string;
  newsId: string;
  createdAt: string;
  news: News;
}

// 사용 예시
const addBookmark = async (newsId: string) => {
  const { data } = await api.post<Bookmark>('/bookmarks', { newsId });
  return data;
};

// React 예시
const BookmarkButton = ({ newsId }: { newsId: string }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const handleBookmark = async () => {
    try {
      await addBookmark(newsId);
      setIsBookmarked(true);
      alert('북마크에 추가되었습니다.');
    } catch (error) {
      if (error.response?.status === 409) {
        alert('이미 북마크된 뉴스입니다.');
      }
    }
  };
  
  return (
    <button onClick={handleBookmark} disabled={isBookmarked}>
      {isBookmarked ? '북마크됨' : '북마크'}
    </button>
  );
};
```

### 2. 북마크 목록 조회

**GET** `/bookmarks` 🔒

```typescript
// Query Parameters
interface GetBookmarksParams {
  cursor?: string;
  limit?: number; // 기본값: 20
}

// Response
interface BookmarksListResponse {
  items: Bookmark[];
  nextCursor: string | null;
  hasMore: boolean;
}

// 사용 예시
const getBookmarks = async (cursor?: string, limit = 20) => {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  if (limit) params.append('limit', limit.toString());
  
  const { data } = await api.get<BookmarksListResponse>(`/bookmarks?${params}`);
  return data;
};

// React 예시
const BookmarksPage = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    loadBookmarks();
  }, []);
  
  const loadBookmarks = async () => {
    const data = await getBookmarks(cursor || undefined);
    setBookmarks([...bookmarks, ...data.items]);
    setCursor(data.nextCursor);
    setHasMore(data.hasMore);
  };
  
  return (
    <div>
      {bookmarks.map((bookmark) => (
        <NewsCard key={bookmark.id} news={bookmark.news} />
      ))}
      {hasMore && <button onClick={loadBookmarks}>더 보기</button>}
    </div>
  );
};
```

### 3. 북마크 삭제

**DELETE** `/bookmarks/:id` 🔒

```typescript
// Path Parameters
// id: 북마크 ID (UUID)

// Response
interface DeleteBookmarkResponse {
  message: string;
}

// 사용 예시
const removeBookmark = async (bookmarkId: string) => {
  const { data } = await api.delete<DeleteBookmarkResponse>(
    `/bookmarks/${bookmarkId}`
  );
  return data;
};

// React 예시
const BookmarkItem = ({ bookmark }: { bookmark: Bookmark }) => {
  const handleRemove = async () => {
    try {
      await removeBookmark(bookmark.id);
      alert('북마크가 삭제되었습니다.');
      // 목록 새로고침
    } catch (error) {
      if (error.response?.status === 404) {
        alert('북마크를 찾을 수 없습니다.');
      }
    }
  };
  
  return (
    <div>
      <h3>{bookmark.news.title}</h3>
      <button onClick={handleRemove}>삭제</button>
    </div>
  );
};
```

---

## 날씨 API

### 1. 현재 날씨 조회

**GET** `/weather`

```typescript
// Query Parameters
interface GetWeatherParams {
  lat: number; // 위도 (필수)
  lon: number; // 경도 (필수)
}

// Response
interface WeatherResponse {
  id: string;
  latitude: number;
  longitude: number;
  temperature: number; // 섭씨
  weatherCode: number; // WMO Weather Code
  windSpeed: number; // km/h
  windDirection: number; // 도 (0-360)
  humidity: number; // %
  timestamp: string;
  expiresAt: string;
}

// 사용 예시
const getWeather = async (lat: number, lon: number) => {
  const { data } = await api.get<WeatherResponse>(
    `/weather?lat=${lat}&lon=${lon}`
  );
  return data;
};

// Geolocation API와 함께 사용
const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const data = await getWeather(latitude, longitude);
          setWeather(data);
        },
        (error) => {
          console.error('위치 정보를 가져올 수 없습니다.', error);
        }
      );
    }
  }, []);
  
  if (!weather) return <div>날씨 정보를 불러오는 중...</div>;
  
  return (
    <div>
      <h3>현재 날씨</h3>
      <p>온도: {weather.temperature}°C</p>
      <p>습도: {weather.humidity}%</p>
      <p>풍속: {weather.windSpeed} km/h</p>
    </div>
  );
};

// Weather Code 해석 함수
const getWeatherDescription = (code: number): string => {
  const weatherCodes: Record<number, string> = {
    0: '맑음',
    1: '대체로 맑음',
    2: '부분적으로 흐림',
    3: '흐림',
    45: '안개',
    48: '서리 안개',
    51: '가벼운 이슬비',
    53: '보통 이슬비',
    55: '심한 이슬비',
    61: '약한 비',
    63: '보통 비',
    65: '강한 비',
    71: '약한 눈',
    73: '보통 눈',
    75: '강한 눈',
    80: '약한 소나기',
    81: '보통 소나기',
    82: '강한 소나기',
    95: '뇌우',
    96: '약한 우박을 동반한 뇌우',
    99: '강한 우박을 동반한 뇌우',
  };
  return weatherCodes[code] || '알 수 없음';
};
```

### 2. 캐시 정리 (관리자용)

**GET** `/weather/clean-cache`

```typescript
// Response
interface CleanCacheResponse {
  message: string;
  count: number;
}

// 사용 예시
const cleanWeatherCache = async () => {
  const { data } = await api.get<CleanCacheResponse>('/weather/clean-cache');
  return data;
};
```

---

## 에러 처리

### HTTP 상태 코드

| 코드 | 의미 | 예시 |
|------|------|------|
| 200 | 성공 | 조회, 로그인 성공 |
| 201 | 생성 성공 | 회원가입, 북마크 추가 |
| 400 | 잘못된 요청 | 유효성 검증 실패 |
| 401 | 인증 실패 | 로그인 필요, 토큰 만료 |
| 404 | 리소스 없음 | 뉴스/북마크를 찾을 수 없음 |
| 409 | 충돌 | 이미 존재하는 이메일/북마크 |
| 500 | 서버 오류 | 내부 서버 오류 |
| 502 | 게이트웨이 오류 | 외부 API 호출 실패 |

### 에러 응답 형식

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

// 사용 예시
const handleApiError = (error: any) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        console.error('잘못된 요청:', data.message);
        break;
      case 401:
        console.error('인증 필요:', data.message);
        // 로그인 페이지로 리다이렉트
        break;
      case 404:
        console.error('리소스를 찾을 수 없습니다:', data.message);
        break;
      case 409:
        console.error('중복된 리소스:', data.message);
        break;
      case 500:
        console.error('서버 오류:', data.message);
        break;
      default:
        console.error('알 수 없는 오류:', data.message);
    }
  } else if (error.request) {
    console.error('서버에 연결할 수 없습니다.');
  } else {
    console.error('요청 중 오류 발생:', error.message);
  }
};

// React Query와 함께 사용
import { useQuery } from '@tanstack/react-query';

const useNews = (cursor?: string) => {
  return useQuery({
    queryKey: ['news', cursor],
    queryFn: () => getNews(cursor),
    onError: handleApiError,
  });
};
```

### React Query 통합 예시

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

// 북마크 추가
const useAddBookmark = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newsId: string) => addBookmark(newsId),
    onSuccess: () => {
      // 북마크 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: handleApiError,
  });
};

// 사용
const BookmarkButton = ({ newsId }: { newsId: string }) => {
  const { mutate, isLoading } = useAddBookmark();
  
  return (
    <button onClick={() => mutate(newsId)} disabled={isLoading}>
      {isLoading ? '추가 중...' : '북마크'}
    </button>
  );
};
```

---

## 추가 팁

### 1. TypeScript 타입 정의 파일

모든 타입을 별도 파일로 관리하는 것이 좋습니다.

```typescript
// types/api.ts
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface News {
  id: string;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  source: string;
  categoryId: string;
  category: Category;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
}

export interface Bookmark {
  id: string;
  userId: string;
  newsId: string;
  createdAt: string;
  news: News;
}

export interface Weather {
  id: string;
  latitude: number;
  longitude: number;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  timestamp: string;
  expiresAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

### 2. API 클라이언트 클래스

```typescript
// services/api-client.ts
import axios from 'axios';
import type { News, Category, Bookmark, Weather, PaginatedResponse } from '../types/api';

class ApiClient {
  private api = axios.create({
    baseURL: 'http://localhost:3000',
    withCredentials: true,
  });

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Auto refresh logic
        // ...
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(email: string, password: string, name?: string) {
    const { data } = await this.api.post('/auth/register', { email, password, name });
    return data;
  }

  async login(email: string, password: string) {
    const { data } = await this.api.post('/auth/login', { email, password });
    return data;
  }

  async refresh() {
    const { data } = await this.api.post('/auth/refresh');
    return data;
  }

  // News
  async getNews(cursor?: string, limit = 20, category?: string, search?: string) {
    const { data } = await this.api.get<PaginatedResponse<News>>('/news', {
      params: { cursor, limit, category, search },
    });
    return data;
  }

  async getCategories() {
    const { data } = await this.api.get<Category[]>('/news/categories');
    return data;
  }

  async getNewsById(id: string) {
    const { data } = await this.api.get<News>(`/news/${id}`);
    return data;
  }

  // Bookmarks
  async addBookmark(newsId: string) {
    const { data } = await this.api.post<Bookmark>('/bookmarks', { newsId });
    return data;
  }

  async getBookmarks(cursor?: string, limit = 20) {
    const { data } = await this.api.get<PaginatedResponse<Bookmark>>('/bookmarks', {
      params: { cursor, limit },
    });
    return data;
  }

  async removeBookmark(id: string) {
    const { data } = await this.api.delete(`/bookmarks/${id}`);
    return data;
  }

  // Weather
  async getWeather(lat: number, lon: number) {
    const { data } = await this.api.get<Weather>('/weather', {
      params: { lat, lon },
    });
    return data;
  }
}

export const apiClient = new ApiClient();
```

### 3. 환경 변수 설정

```typescript
// .env.local (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:3000

// .env (Create React App)
REACT_APP_API_URL=http://localhost:3000

// vite.config.ts (Vite)
export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000'),
  },
});
```

---

## 문의

- Swagger 문서: `http://localhost:3000/api`
- 프로젝트 이슈: GitHub Issues
