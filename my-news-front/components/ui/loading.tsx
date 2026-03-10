'use client';

import { Loader2 } from 'lucide-react';

export function LoadingSpinner({
  size = 'default',
}: {
  size?: 'small' | 'default' | 'large';
}) {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[var(--primary)]`} />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="news-item-shell animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-[var(--line)]">
      <div className="news-item-row flex">
        <div className="h-20 w-20 shrink-0 rounded-lg bg-[#edf2f7]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-full rounded bg-[#edf2f7]" />
          <div className="h-4 w-3/4 rounded bg-[#edf2f7]" />
          <div className="h-3 w-24 rounded bg-[#edf2f7]" />
        </div>
      </div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size="large" />
    </div>
  );
}
