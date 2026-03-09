'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Newspaper, User } from 'lucide-react';

const navItems = [
  { href: '/', label: '홈', icon: Home },
  { href: '/news', label: '뉴스', icon: Newspaper },
  { href: '/mypage', label: '마이페이지', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#ddd7ce] bg-[#fbfaf7]/92 backdrop-blur supports-[backdrop-filter]:bg-[#fbfaf7]/80">
      <div className="mx-auto w-full max-w-[1280px] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-3 sm:px-6">
        <ul className="mx-auto grid w-full max-w-[720px] grid-cols-3">
          {navItems.map(({ href, label, icon: Icon }, index) => {
            const isActive =
              href === '/'
                ? pathname === href
                : pathname === href || pathname?.startsWith(`${href}/`);

            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  className={`flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[18px] px-2 py-3 text-[11px] font-semibold transition-colors sm:min-h-[74px] sm:px-3 sm:text-sm ${
                    isActive ? 'text-[#2f3947]' : 'text-[#9aa2ad]'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${
                      isActive ? 'text-[#2f3947]' : 'text-[#aeb5bf]'
                    }`}
                  />
                  <span className="leading-none">{label}</span>
                </Link>
                {index < navItems.length - 1 && (
                  <span className="absolute right-0 top-1/2 h-10 w-px -translate-y-1/2 bg-[#e6e1d9] sm:h-12" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
