'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NewsList } from '@/components/news/news-list';
import { NewsTopTabs } from '@/components/news/news-top-tabs';

function NewsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  const handleChangeCategory = (categorySlug: string) => {
    setSelectedCategory(categorySlug);

    const nextParams = new URLSearchParams(searchParams.toString());

    if (categorySlug) {
      nextParams.set('category', categorySlug);
    } else {
      nextParams.delete('category');
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/news?${nextQuery}` : '/news', { scroll: false });
  };

  return (
    <div className="space-y-3">
      <NewsTopTabs selected={selectedCategory} onChange={handleChangeCategory} />
      <NewsList category={selectedCategory || undefined} />
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="space-y-3" />}>
      <NewsPageContent />
    </Suspense>
  );
}
