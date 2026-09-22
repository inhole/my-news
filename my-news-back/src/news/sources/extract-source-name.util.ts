/**
 * Derives a display-friendly source name from a URL's hostname
 * (e.g. `https://www.yonhapnews.co.kr/...` -> `yonhapnews.co.kr`).
 * Shared by adapters and by `news.service`'s article-metadata crawler,
 * which needs the same fallback when a page's own site-name meta tag
 * is missing.
 */
export function extractSourceName(
  url: string,
  fallback = 'Naver News',
): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return fallback;
  }
}
