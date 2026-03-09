import type { Metadata } from 'next';
import { BottomNav } from '@/components/layout/bottom-nav';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'My News - 모바일 뉴스',
  description: '토스 스타일 반응형 뉴스 앱',
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
          <div className="relative min-h-[100dvh]">
            <main
              id="app-scroll-container"
              className="mx-auto h-[100dvh] w-full max-w-[960px] overflow-y-auto px-4 pb-28 pt-3 sm:px-6"
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
