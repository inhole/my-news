# 뉴스 제목 HTML 엔티티 정규화

## 변경 내용

- 뉴스 제목과 설명에 `&middot;`, `&amp;`, `&#39;` 같은 HTML 엔티티가 그대로 보이지 않도록 정규화 처리를 추가했다.
- 프런트 응답 정규화 단계에서 엔티티를 사람이 읽는 문자로 변환해 기존 저장 데이터에도 바로 반영되도록 했다.
- 백엔드 텍스트 정규화 단계에도 같은 보정을 추가해 이후 수집되는 기사에는 엔티티가 원문 그대로 남지 않도록 했다.

## 적용 범위

- 제목 `title`
- 설명 `description`
- 숫자형 HTML 엔티티 `&#...;`, `&#x...;`
- 주요 named entity: `&middot;`, `&amp;`, `&quot;`, `&apos;`, `&nbsp;`, `&lt;`, `&gt;`

## 영향 파일

- `my-news-front/lib/api/news-normalizer.ts`
- `my-news-back/src/news/news.service.ts`
