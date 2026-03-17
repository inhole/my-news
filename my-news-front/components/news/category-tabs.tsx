'use client';

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
      <div className="scrollbar-hide overflow-x-auto overflow-y-hidden py-3">
        <div className="flex min-w-max gap-4 pr-2">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-12 w-16 animate-pulse rounded-md bg-[var(--surface-soft)]" />
          ))}
        </div>
      </div>
    );
  }

  const items = [{ id: 'all', slug: '', name: defaultLabel }, ...(categories ?? [])];

  return (
    <div className="scrollbar-hide overflow-x-auto overflow-y-hidden py-3">
      <div className="flex min-w-max touch-pan-x gap-4 pr-2">
        {items.map((item) => {
          const isActive = item.slug === (selected ?? '');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.slug)}
              className={`shrink-0 px-1 py-3 text-[15px] transition ${
                isActive
                  ? 'font-bold text-[var(--primary-strong)]'
                  : 'font-medium text-[#4e5968] hover:text-[var(--primary-strong)]'
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
