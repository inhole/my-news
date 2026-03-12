'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { NewsList } from '@/components/news/news-list';

function NewsPageContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;

  return <NewsList category={category} search={search} />;
}

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="space-y-3" />}>
      <NewsPageContent />
    </Suspense>
  );
}
