'use client';

import { FileX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = '데이터가 없습니다',
  message = '표시할 내용이 없습니다.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-5 py-12 text-center shadow-sm ring-1 ring-[var(--line)]">
      {icon || <FileX className="mb-4 h-10 w-10 text-[#9ca3af]" />}
      <h3 className="text-lg font-semibold text-[#111827]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6b7280]">{message}</p>
    </div>
  );
}
