'use client';

import { useCategories } from '@/hooks/use-queries';

interface CategoryTabsProps {
  selected?: string;
  onChange: (categorySlug: string) => void;
  defaultLabel?: string;
}

export function CategoryTabs({ selected, onChange, defaultLabel = '전체' }: CategoryTabsProps) {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="scrollbar-hide overflow-x-auto overflow-y-hidden px-2 sm:px-4">
        <div className="flex min-w-max items-end gap-6 pr-2">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-10 w-16 animate-pulse border-b-2 border-transparent bg-[#eef2f6]" />
          ))}
        </div>
      </div>
    );
  }

  const items = [{ id: 'all', slug: '', name: defaultLabel }, ...(categories ?? [])];

  return (
    <div className="scrollbar-hide overflow-x-auto overflow-y-hidden px-2 sm:px-4">
      <div className="flex min-w-max touch-pan-x items-end gap-6 pr-2">
        {items.map((item) => {
          const isActive = item.slug === (selected ?? '');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.slug)}
              className={`shrink-0 border-b-2 px-1 py-3 font-semibold transition-colors ${
                isActive
                  ? 'border-[var(--primary)] text-[var(--text)]'
                  : 'border-transparent text-[#4e5968] hover:text-[var(--text)]'
              }`}
              style={{ fontSize: '19px', lineHeight: '28px' }}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
