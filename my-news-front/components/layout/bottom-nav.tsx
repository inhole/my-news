'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Home, Newspaper } from 'lucide-react';

const navItems = [
  { href: '/', label: '홈', icon: Home },
  { href: '/news', label: '뉴스', icon: Newspaper },
  { href: '/mypage', label: '피드', icon: Brain },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="z-50 border-t border-[var(--line)] bg-white/92 backdrop-blur">
      <div className="mx-auto w-full max-w-[980px] px-3 pb-[env(safe-area-inset-bottom,0px)] pt-2 sm:px-6">
        <ul className="grid h-[var(--bottom-nav-height)] w-full grid-cols-3 gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/'
                ? pathname === href
                : pathname === href || pathname?.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex h-full flex-col items-center justify-center rounded-2xl text-[11px] font-semibold leading-none transition ${
                    isActive
                      ? 'bg-[var(--primary-weak)] text-[var(--primary-strong)]'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'
                  }`}
                >
                  <Icon className={`mb-1 ${isActive ? 'h-5 w-5' : 'h-[18px] w-[18px]'}`} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
