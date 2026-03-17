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
      <div className="top-nav-tabs-scroll">
        <div className="top-nav-tabs">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-12 w-16 animate-pulse rounded-md bg-[var(--surface-soft)]" />
          ))}
        </div>
      </div>
    );
  }

  const items = [{ id: 'all', slug: '', name: defaultLabel }, ...(categories ?? [])];

  return (
    <div className="top-nav-tabs-scroll">
      <div className="top-nav-tabs">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.slug)}
            className={`top-nav-tab ${item.slug === (selected ?? '') ? 'top-nav-tab-active' : ''}`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
