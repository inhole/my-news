import axios from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // HttpOnly 쿠키 포함
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request 인터셉터 - Access Token 자동 추가
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response 인터셉터 - Token 만료 시 자동 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러이고 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh Token으로 새 Access Token 발급
        const { data } = await axios.post(
          `${apiBaseUrl}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // 새 Access Token 저장
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', data.accessToken);
        }

        // 원래 요청에 새 토큰 추가하여 재시도
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh 실패 시 로그인 페이지로 이동
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
