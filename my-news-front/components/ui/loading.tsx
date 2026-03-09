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
    <div className="flex items-center justify-center py-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[#2f3947]`} />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="animate-pulse rounded-[24px] border border-[#ddd6cd] bg-[#fbfaf7] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex gap-4">
        <div className="h-28 w-28 shrink-0 rounded-[18px] bg-[#ebe6de]" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 rounded-full bg-[#ebe6de]" />
          <div className="h-5 w-full rounded-full bg-[#ebe6de]" />
          <div className="h-5 w-4/5 rounded-full bg-[#ebe6de]" />
          <div className="h-4 w-20 rounded-full bg-[#ebe6de]" />
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
