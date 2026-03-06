// ==================== 에러 처리 유틸리티 ====================
export const handleApiError = (error: any): string => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return `잘못된 요청: ${Array.isArray(data.message) ? data.message.join(', ') : data.message}`;
      case 401:
        return '인증이 필요합니다. 다시 로그인해주세요.';
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.';
      case 409:
        return `중복된 리소스: ${data.message}`;
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 502:
        return '외부 서비스 연결에 실패했습니다.';
      default:
        return `오류가 발생했습니다: ${data.message || '알 수 없는 오류'}`;
    }
  } else if (error.request) {
    return '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
  } else {
    return `요청 중 오류 발생: ${error.message}`;
  }
};
