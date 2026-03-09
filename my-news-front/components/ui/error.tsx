'use client';

import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = '오류가 발생했습니다',
  message = '다시 시도해 주세요.',
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#f0d2d2] bg-[#fff7f7] px-5 py-12 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-[#dc6262]" />
      <h3 className="text-lg font-bold text-[#2f3947]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6b7280]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-full bg-[#2f3947] px-4 py-2 text-sm font-semibold text-white"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
