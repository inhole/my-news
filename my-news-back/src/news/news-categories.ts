export interface NewsCategoryDefinition {
  slug: string;
  name: string;
  description: string;
  searchQuery: string;
}

export const NEWS_CATEGORIES: NewsCategoryDefinition[] = [
  {
    slug: 'general',
    name: '종합',
    description: '국내 주요 뉴스',
    searchQuery: '한국 주요 뉴스',
  },
  {
    slug: 'business',
    name: '경제',
    description: '경제 및 산업 뉴스',
    searchQuery: '한국 경제',
  },
  {
    slug: 'technology',
    name: '기술',
    description: 'IT 및 기술 뉴스',
    searchQuery: '한국 IT 기술',
  },
  {
    slug: 'entertainment',
    name: '연예',
    description: '연예 및 문화 뉴스',
    searchQuery: '한국 연예',
  },
  {
    slug: 'sports',
    name: '스포츠',
    description: '스포츠 뉴스',
    searchQuery: '한국 스포츠',
  },
  {
    slug: 'science',
    name: '과학',
    description: '과학 뉴스',
    searchQuery: '한국 과학',
  },
  {
    slug: 'health',
    name: '건강',
    description: '건강 및 의학 뉴스',
    searchQuery: '한국 건강 의학',
  },
];

export const NEWS_CATEGORY_MAP = Object.fromEntries(
  NEWS_CATEGORIES.map((category) => [category.slug, category]),
) as Record<string, NewsCategoryDefinition>;

export const NEWS_CATEGORY_SLUGS = NEWS_CATEGORIES.map(
  (category) => category.slug,
);
