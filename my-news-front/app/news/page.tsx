'use client';

import { useState } from 'react';
import { NewsList } from '@/components/news/news-list';
import { NewsTopTabs } from '@/components/news/news-top-tabs';

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  return (
    <div className="pt-[72px]">
      <NewsTopTabs selected={selectedCategory} onChange={setSelectedCategory} />
      <NewsList category={selectedCategory || undefined} />
    </div>
  );
}
