import type { Metadata } from 'next';
import { BottomNav } from '@/components/layout/bottom-nav';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'My News',
  description: '개인화 뉴스와 날씨를 한 번에 보는 My News',
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
            <main
              id="app-scroll-container"
              className="mx-auto min-h-0 w-full max-w-[980px] flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6"
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
