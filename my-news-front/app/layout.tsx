import type { Metadata } from 'next';
import { BottomNav } from '@/components/layout/bottom-nav';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'My News - 모바일 뉴스',
  description: '카테고리별 뉴스와 날씨를 반응형 레이아웃으로 확인하는 뉴스 앱',
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
          <div className="relative min-h-[100dvh] bg-[linear-gradient(180deg,#edf2f8_0%,#d6e0ec_22%,#c3cfdb_100%)]">
            <main
              id="app-scroll-container"
              className="h-[100dvh] overflow-y-auto overflow-x-hidden pb-28"
            >
              <div className="mx-auto min-h-full w-full max-w-[1280px]">
                {children}
              </div>
            </main>
            <BottomNav />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
