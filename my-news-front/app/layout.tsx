import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "My News - 나만의 뉴스",
  description: "나만의 관심 뉴스를 확인하세요",
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
          <div className="min-h-screen">
            <Header />
            <main className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
