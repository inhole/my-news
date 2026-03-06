import apiClient from '@/lib/api-client';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from '@/types';

// ==================== 인증 API ====================
export const authApi = {
  // 회원가입
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    // Access Token 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  },

  // 로그인
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    // Access Token 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  },

  // 토큰 갱신
  refresh: async (): Promise<{ accessToken: string }> => {
    const response = await apiClient.post('/auth/refresh');
    // Access Token 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  },

  // 로그아웃
  logout: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
  },
};
