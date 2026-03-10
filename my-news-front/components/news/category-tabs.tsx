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
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto px-2 py-3 sm:px-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-9 w-16 animate-pulse rounded-full bg-[#eef2f6]" />
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
                : 'bg-[#f2f4f6] text-[#4e5968] hover:bg-[#e9ecef]'
            }`}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
