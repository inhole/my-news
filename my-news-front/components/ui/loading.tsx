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
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[var(--primary-strong)]`} />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="news-item-shell toss-card animate-pulse">
      <div className="news-item-row flex">
        <div className="news-card-thumb shrink-0 rounded-[22px] bg-[#eef3f8]" />
        <div className="flex flex-1 flex-col justify-between self-stretch">
          <div className="space-y-3">
            <div className="h-3 w-20 rounded-full bg-[#eaf3ff]" />
            <div className="h-4 w-full rounded-full bg-[#eef3f8]" />
            <div className="h-4 w-5/6 rounded-full bg-[#eef3f8]" />
            <div className="h-4 w-2/3 rounded-full bg-[#eef3f8]" />
          </div>
          <div className="mt-4 h-3 w-28 rounded-full bg-[#eef3f8]" />
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
