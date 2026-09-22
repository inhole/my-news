'use client';

import { Suspense } from 'react';
import { HomeContent } from '@/components/home/home-content';
import { HomeLoading } from '@/components/home/home-loading';

export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}
