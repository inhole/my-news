'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Newspaper, Search, X } from 'lucide-react';
import { NewsCard } from '@/components/news/news-card';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingCard, LoadingSpinner } from '@/components/ui/loading';
import { useInfiniteNews, useSemanticSearchNews } from '@/hooks/use-queries';

interface NewsListProps {
  category?: string;
  search?: string;
  searchMode?: 'keyword' | 'semantic';
}

export function NewsList({ category, search, searchMode = 'keyword' }: NewsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const observerRef = useRef<HTMLDivElement>(null);
  const isSemanticMode = Boolean(search) && searchMode === 'semantic';

  const keywordQuery = useInfiniteNews(category, search, !isSemanticMode);
  const semanticQuery = useSemanticSearchNews(search || '', isSemanticMode);

  const allNews = isSemanticMode
    ? semanticQuery.data?.items ?? []
    : keywordQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isLoading = isSemanticMode ? semanticQuery.isLoading : keywordQuery.isLoading;
  const isError = isSemanticMode ? semanticQuery.isError : keywordQuery.isError;
  const error = isSemanticMode ? semanticQuery.error : keywordQuery.error;
  const refetch = isSemanticMode ? semanticQuery.refetch : keywordQuery.refetch;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !isSemanticMode &&
          entries[0].isIntersecting &&
          keywordQuery.hasNextPage &&
          !keywordQuery.isFetchingNextPage
        ) {
          keywordQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [isSemanticMode, keywordQuery]);

  const handleSearchModeChange = (nextMode: 'keyword' | 'semantic') => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextMode === 'semantic') nextParams.set('mode', 'semantic');
    else nextParams.delete('mode');
    router.push(nextParams.toString() ? `/news?${nextParams.toString()}` : '/news');
  };

  const handleSearchSubmit = (value: string) => {
    const keyword = value.trim();
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.delete('cursor');
    if (keyword) nextParams.set('search', keyword);
    else {
      nextParams.delete('search');
      nextParams.delete('mode');
    }

    router.push(nextParams.toString() ? `/news?${nextParams.toString()}` : '/news');
  };

  const handleSearchClear = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('search');
    nextParams.delete('mode');
    router.push(nextParams.toString() ? `/news?${nextParams.toString()}` : '/news');
  };

  const modeSwitch = search ? (
    <SearchModeSwitch selected={searchMode} onChange={handleSearchModeChange} />
  ) : null;
  const searchBar = (
    <SearchBar
      key={search || 'empty-search'}
      initialValue={search || ''}
      onSubmit={handleSearchSubmit}
      onClear={handleSearchClear}
    />
  );

  if (isLoading) {
    return (
      <>
        {searchBar}
        {modeSwitch}
        <div className="news-list-wrap news-list-grid grid lg:grid-cols-2">
          {[...Array(6)].map((_, index) => (
            <LoadingCard key={index} />
          ))}
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {searchBar}
        {modeSwitch}
        <ErrorMessage
          title={isSemanticMode ? '의미 검색을 사용할 수 없습니다' : '뉴스를 불러오지 못했습니다'}
          message={
            error?.message ||
            (isSemanticMode
              ? 'RAG 색인 또는 Ollama 임베딩 설정을 확인해 주세요.'
              : '잠시 후 다시 시도해 주세요.')
          }
          onRetry={() => refetch()}
        />
      </>
    );
  }

  if (allNews.length === 0) {
    return (
      <>
        {searchBar}
        {modeSwitch}
        <EmptyState
          title={search ? '검색 결과가 없습니다' : '뉴스가 없습니다'}
          message={search ? '다른 검색어로 다시 시도해 보세요.' : '아직 등록된 뉴스가 없습니다.'}
          icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
        />
      </>
    );
  }

  return (
    <div className="news-list-wrap space-y-3 pb-4">
      {searchBar}
      {modeSwitch}

      <div className="news-list-grid grid lg:grid-cols-2">
        {allNews.map((news) => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>

      <div ref={observerRef} className="py-4">
        {!isSemanticMode && keywordQuery.isFetchingNextPage && <LoadingSpinner />}
      </div>

      {(!keywordQuery.hasNextPage || isSemanticMode) && allNews.length > 0 && (
        <p className="py-2 text-center text-xs text-[#9ca3af]">모든 뉴스를 확인했습니다</p>
      )}
    </div>
  );
}

function SearchBar({
  initialValue,
  onSubmit,
  onClear,
}: {
  initialValue: string;
  onSubmit: (value: string) => void;
  onClear: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  const handleClear = () => {
    setValue('');
    onClear();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-3 flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2"
    >
      <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="뉴스 검색"
        className="h-9 min-w-0 flex-1 bg-transparent text-sm font-medium text-[#111827] outline-none placeholder:text-[#9ca3af]"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[#6b7280] hover:bg-[var(--surface-soft)]"
          aria-label="검색어 지우기"
          title="검색어 지우기"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      <button
        type="submit"
        className="h-9 shrink-0 rounded-[8px] bg-[var(--primary)] px-4 text-sm font-semibold text-white"
      >
        검색
      </button>
    </form>
  );
}

function SearchModeSwitch({
  selected,
  onChange,
}: {
  selected: 'keyword' | 'semantic';
  onChange: (mode: 'keyword' | 'semantic') => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-[#111827]">검색 방식</p>
        <p className="text-xs text-[#6b7280]">의미 검색은 RAG 벡터 색인을 사용합니다.</p>
      </div>
      <div className="flex shrink-0 rounded-[8px] bg-[var(--surface-soft)] p-1">
        <button
          type="button"
          onClick={() => onChange('keyword')}
          className={`h-8 rounded-[6px] px-3 text-sm font-semibold ${
            selected === 'keyword' ? 'bg-white text-[var(--primary-strong)] shadow-sm' : 'text-[#6b7280]'
          }`}
        >
          키워드
        </button>
        <button
          type="button"
          onClick={() => onChange('semantic')}
          className={`h-8 rounded-[6px] px-3 text-sm font-semibold ${
            selected === 'semantic' ? 'bg-white text-[var(--primary-strong)] shadow-sm' : 'text-[#6b7280]'
          }`}
        >
          의미
        </button>
      </div>
    </div>
  );
}
