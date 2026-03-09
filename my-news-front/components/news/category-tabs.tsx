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
      <div className="scrollbar-hide flex items-center gap-3 overflow-x-auto px-2 py-3 sm:px-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-9 w-16 animate-pulse rounded-full bg-[#edf1f5]" />
        ))}
      </div>
    );
  }

  const items = [{ id: 'all', slug: '', name: defaultLabel }, ...(categories ?? [])];

  return (
    <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto px-2 py-3 sm:px-4">
      {items.map((item) => {
        const isActive = item.slug === (selected ?? '');

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.slug)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#ebeff3]'
            }`}
          >
            {item.name}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="카테고리 더보기"
        className="ml-1 shrink-0 rounded-full bg-[#f3f4f6] p-2 text-[#9ca3af]"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
