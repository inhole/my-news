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
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-5 py-12 text-center shadow-sm ring-1 ring-[#fee2e2]">
      <AlertCircle className="mb-3 h-10 w-10 text-[var(--danger)]" />
      <h3 className="text-lg font-semibold text-[#111827]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6b7280]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
