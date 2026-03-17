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
        <div className="flex min-w-max gap-2 pr-2">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-11 w-20 animate-pulse rounded-full bg-[var(--surface-soft)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const items = [{ id: 'all', slug: '', name: defaultLabel }, ...(categories ?? [])];

  return (
    <div className="scrollbar-hide overflow-x-auto overflow-y-hidden py-3">
      <div className="flex min-w-max touch-pan-x gap-2 pr-2">
        {items.map((item) => {
          const isActive = item.slug === (selected ?? '');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.slug)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-[var(--primary-strong)] text-white shadow-[0_6px_18px_rgba(27,100,218,0.22)]'
                  : 'bg-[var(--surface-soft)] text-[#4e5968] hover:bg-[#e9eef5]'
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
