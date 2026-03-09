import type { AxiosError } from 'axios';

type ApiErrorResponse = {
  message?: string | string[];
};

export const handleApiError = (error: unknown): string => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const responseMessage = axiosError.response?.data?.message;
  const message = Array.isArray(responseMessage)
    ? responseMessage.join(', ')
    : responseMessage || '알 수 없는 오류';

  if (axiosError.response) {
    switch (axiosError.response.status) {
      case 400:
        return `잘못된 요청입니다: ${message}`;
      case 401:
        return '인증이 필요합니다. 다시 로그인해 주세요.';
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.';
      case 409:
        return `중복된 요청입니다: ${message}`;
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      case 502:
        return '외부 서비스 연결에 실패했습니다.';
      default:
        return `오류가 발생했습니다: ${message}`;
    }
  }

  if (axiosError.request) {
    return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.';
  }

  return `요청 처리 중 오류가 발생했습니다: ${axiosError.message}`;
};
