/**
 * GeekNews / Hacker News 등 개발자 커뮤니티 글 전용 타입.
 *
 * `GET /news/community` 응답은 카테고리 관계를 include하지 않으므로
 * `categoryId`는 항상 null이고 `category` 필드 자체가 존재하지 않는다.
 * 기존 `News` 타입은 `category: Category`를 필수로 요구하고 여러 컴포넌트가
 * `article.category.name`을 무조건 읽기 때문에, `News`를 재사용하면 런타임 오류가 난다.
 * 그래서 커뮤니티 글은 별도 타입/정규화 함수로 다룬다.
 */
export interface CommunityNews {
  id: string;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  /** 'GeekNews' | 'Hacker News' */
  source: string;
  /** GeekNews 제출자 또는 Hacker News 작성자. 기사 저자가 아니다. */
  author: string | null;
  /** Hacker News 포인트. GeekNews 글은 항상 null. */
  externalScore: number | null;
  /** Hacker News 댓글 수. GeekNews 글은 항상 null. */
  externalCommentCount: number | null;
  createdAt?: string;
}

export interface CommunityNewsListResponse {
  items: CommunityNews[];
  nextCursor: string | null;
  hasMore: boolean;
}
