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
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#ddd6cd] bg-[#fbfaf7] px-5 py-12 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      {icon || <FileX className="mb-4 h-12 w-12 text-[#98a0ab]" />}
      <h3 className="text-lg font-bold text-[#2f3947]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6b7280]">{message}</p>
    </div>
  );
}
