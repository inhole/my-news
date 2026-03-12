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
    <div className="toss-card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 rounded-full bg-[#fff1f3] p-3 text-[var(--danger)]">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-[#111827]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6b7280]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-2xl bg-[var(--primary-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
