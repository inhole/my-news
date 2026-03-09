'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Newspaper, User } from 'lucide-react';

const navItems = [
  { href: '/', label: '홈', icon: Home },
  { href: '/news', label: '뉴스', icon: Newspaper },
  { href: '/mypage', label: '마이', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line)] bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-[960px] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2 sm:px-6">
        <ul className="grid grid-cols-3 gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/'
                ? pathname === href
                : pathname === href || pathname?.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex min-h-[62px] flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[var(--primary-weak)] text-[var(--primary)]'
                      : 'text-[#9ca3af] hover:bg-[#f3f4f6]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-1">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
