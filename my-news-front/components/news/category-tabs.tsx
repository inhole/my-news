'use client';

import { MoreHorizontal } from 'lucide-react';
import { useCategories } from '@/hooks/use-queries';

interface CategoryTabsProps {
  selected?: string;
  onChange: (categorySlug: string) => void;
  defaultLabel?: string;
}

export function CategoryTabs({
  selected,
  onChange,
  defaultLabel = '전체',
}: CategoryTabsProps) {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="scrollbar-hide flex items-center gap-6 overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-7 w-16 animate-pulse rounded-full bg-[#ebe5dc]" />
        ))}
      </div>
    );
  }

  const items = [{ id: 'all', slug: '', name: defaultLabel }, ...(categories ?? [])];

  return (
    <div className="scrollbar-hide flex items-center gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8">
      {items.map((item) => {
        const isActive = item.slug === (selected ?? '');

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.slug)}
            className={`shrink-0 border-b-[3px] pb-4 pt-5 text-sm font-bold tracking-[-0.02em] transition-colors sm:text-base ${
              isActive
                ? 'border-[#ef7d2a] text-[#ef7d2a]'
                : 'border-transparent text-[#374151]'
            }`}
          >
            {item.name}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="카테고리 더보기"
        className="ml-auto shrink-0 pb-4 pt-5 text-[#a0a7b2]"
      >
        <MoreHorizontal className="h-6 w-6" />
      </button>
    </div>
  );
}
