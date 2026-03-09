'use client';

import { useEffect, useRef, useState } from 'react';
import { CategoryTabs } from '@/components/news/category-tabs';

interface NewsTopTabsProps {
  selected?: string;
  onChange: (categorySlug: string) => void;
}

export function NewsTopTabs({ selected, onChange }: NewsTopTabsProps) {
  const [visible, setVisible] = useState(true);
  const lastScrollTopRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const scrollContainer = document.getElementById('app-scroll-container');
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      if (tickingRef.current) {
        return;
      }

      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentScrollTop = scrollContainer.scrollTop;
        const previousScrollTop = lastScrollTopRef.current;

        if (currentScrollTop <= 8) {
          setVisible(true);
        } else if (currentScrollTop > previousScrollTop + 10) {
          setVisible(false);
        } else if (currentScrollTop < previousScrollTop - 10) {
          setVisible(true);
        }

        lastScrollTopRef.current = currentScrollTop;
        tickingRef.current = false;
      });
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-40 transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="border-b border-[#ddd7ce] bg-[#fbfaf7]/95 backdrop-blur supports-[backdrop-filter]:bg-[#fbfaf7]/80">
        <div className="mx-auto w-full max-w-[1280px]">
          <CategoryTabs selected={selected} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}
