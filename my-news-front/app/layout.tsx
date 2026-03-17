import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppTopNav } from '@/components/layout/app-top-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'My News',
  description: '익명 개인화 기반 뉴스와 날씨를 한 번에 보는 My News',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <div className="flex h-dvh flex-col">
            <Suspense fallback={null}>
              <AppTopNav />
            </Suspense>
            <main
              id="app-scroll-container"
              className="app-main mx-auto min-h-0 w-full max-w-[980px] flex-1 overflow-x-hidden overflow-y-auto"
            >
              {children}
            </main>
            <BottomNav />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
