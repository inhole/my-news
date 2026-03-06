'use client';

import { useState } from 'react';
import { CategoryTabs } from '@/components/news/category-tabs';
import { NewsList } from '@/components/news/news-list';

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  return (
    <>
      <CategoryTabs selected={selectedCategory} onChange={setSelectedCategory} />

      <div className="max-w-screen-xl mx-auto px-4 md:px-6 pt-6">
        <NewsList category={selectedCategory || undefined} />
      </div>
    </>
  );
}
