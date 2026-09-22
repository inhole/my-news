# RAG 벡터 파이프라인

이 문서는 뉴스 의미 검색을 위한 RAG 벡터 파이프라인만 다룹니다. 로컬 LLM 요약 기능은 `docs/로컬-LLM-뉴스-요약.md`를 참고합니다.

## 구성

- 저장소: Neon PostgreSQL + `pgvector`
- 임베딩 생성: Ollama `nomic-embed-text`
- 벡터 차원: `768`
- 저장 테이블: `NewsEmbedding`
- 검색 API: `GET /news/semantic-search?q=...`
- 재색인 API: `POST /news/embeddings/reindex`

## 동작 로직

RAG 벡터 검색은 기사 내용을 숫자 벡터로 바꿔 저장해 두고, 검색어도 같은 방식으로 벡터화한 뒤 의미적으로 가까운 기사를 찾는 방식입니다.

```text
뉴스 수집
  -> News 저장
  -> title + description + content 결합
  -> chunk 분리
  -> Ollama embedding 생성
  -> NewsEmbedding.embedding 저장

사용자 검색
  -> 검색어 embedding 생성
  -> pgvector cosine distance 검색
  -> 가장 가까운 chunk와 News 반환
  -> 프론트에 유사도와 매칭 chunk 표시
```

## 색인 흐름

뉴스가 수집되면 `NewsService`가 `News`를 저장한 뒤 `NewsRagService.indexNews(newsId)`를 호출합니다.

1. `News.title`, `News.description`, `News.content`를 하나의 텍스트로 합칩니다.
2. `RAG_CHUNK_SIZE` 기준으로 본문을 chunk로 나눕니다.
3. 나눈 chunk 전체에 대해 Ollama `/api/embeddings`로 벡터를 먼저 모두 생성합니다.
4. 벡터 생성이 모두 끝나면 같은 뉴스 + 현재 `RAG_EMBEDDING_MODEL` 조합의 기존 `NewsEmbedding` 행을 삭제하고 새 chunk를 삽입하는 작업을 하나의 트랜잭션으로 처리합니다.
5. 벡터 생성 중 실패하거나 트랜잭션이 실패하면 기존 색인은 삭제되지 않고 그대로 검색에 남습니다.
6. 같은 `newsId` + `model` 조합에 대한 재색인 요청은 서버 프로세스 내에서 순서대로만 실행되도록 직렬화해, 동시 재색인 요청이 삭제/삽입을 서로 경쟁하며 일부 chunk를 잃어버리는 상황을 막습니다.
7. 삭제·삽입 범위는 재색인 대상 뉴스와 현재 임베딩 모델로 한정되므로, 과거에 다른 임베딩 모델로 색인한 행이나 다른 뉴스의 행은 영향받지 않습니다.
8. 기사 제목/설명/본문이 모두 비어 색인할 chunk가 없으면, 새로 만들 chunk가 없다는 이유만으로 기존 색인을 남겨두지 않고 같은 뉴스 + 모델의 기존 행을 명시적으로 삭제해 더 이상 검색되지 않게 합니다.
9. 반복되는 본문 등으로 인해 동일한 chunk 텍스트가 여러 번 나오면 `chunkHash`가 같아지므로, 삽입 전에 중복 chunk를 제거해 유니크 제약 충돌 없이 한 번만 저장합니다.

기존 뉴스는 아래 API로 재색인합니다. 관리자 전용 API이므로 `x-news-admin-key` 헤더에 서버에 설정된 `NEWS_ADMIN_API_KEY` 값을 담아 호출해야 하며, 없거나 값이 다르면 각각 403/401로 거부됩니다. `limit`은 1~100 사이만 허용합니다.

```http
POST /news/embeddings/reindex
Content-Type: application/json
x-news-admin-key: <NEWS_ADMIN_API_KEY 값>

{
  "limit": 50
}
```

## 검색 흐름

프론트에서 의미 검색을 선택하면 아래 API를 호출합니다.

```http
GET /news/semantic-search?q=AI%20반도체%20전망&limit=10
```

검색 API는 인증이 필요 없는 공개 API이며, `limit`은 1~50 사이만 허용합니다.

백엔드 처리 흐름:

1. 검색어를 Ollama `/api/embeddings`로 벡터화합니다.
2. `NewsEmbedding.embedding <=> queryVector`로 cosine distance를 계산합니다.
3. 기사별로 가장 가까운 chunk를 고릅니다.
4. 가까운 순서대로 `News`와 `Category`를 함께 반환합니다.
5. 응답에 `rag.matchedChunk`, `rag.similarity`를 포함합니다.

프론트 표시:

- 검색 URL: `/news?search=검색어&mode=semantic`
- 검색 방식 전환: `키워드 / 의미`
- 카드 표시: 의미 유사도, 매칭된 chunk 일부

## 로컬 준비

```bash
ollama pull nomic-embed-text
```

```env
ENABLE_RAG_INDEXING=true
RAG_EMBEDDING_PROVIDER=ollama
RAG_EMBEDDING_MODEL=nomic-embed-text
RAG_CHUNK_SIZE=1200
RAG_CHUNK_OVERLAP=160
OLLAMA_BASE_URL=http://localhost:11434
NEWS_ADMIN_API_KEY=<관리자 전용 재색인/요약 재생성 API 키>
```

`NEWS_ADMIN_API_KEY`가 설정되지 않은 서버는 `POST /news/embeddings/reindex` 요청을 403으로 거부합니다.

## DB 반영

마이그레이션은 `pgvector` 확장, `NewsEmbedding` 테이블, HNSW 인덱스를 생성합니다.

```bash
npm run db:migrate:dev --workspace my-news-back
npm run db:generate --workspace my-news-back
```

운영 반영:

```bash
npm run db:migrate:deploy --workspace my-news-back
```

## 운영 판단

무료 Render Web Service에서 Ollama를 직접 실행해 embedding을 생성하는 구성은 권장하지 않습니다. 무료 인스턴스는 메모리/CPU가 작고, spin down 및 임시 파일시스템 제약이 있습니다.

무료 운영 환경에서는 기본적으로 아래처럼 둡니다.

```env
ENABLE_RAG_INDEXING=false
```

RAG 검색만 운영에서 사용하려면 embedding 생성 작업을 로컬 또는 별도 LLM 서버에서 처리하고, Render API는 Neon에 저장된 embedding을 검색하는 역할로 제한하는 편이 안전합니다.

자세한 운영 판단과 대안은 `docs/RAG-로컬-LLM-운영-검토.md`를 참고합니다.

## 주의

- `NewsEmbedding.embedding`은 Prisma가 직접 지원하지 않는 PostgreSQL `vector` 타입이라 raw SQL을 사용합니다.
- 임베딩 모델을 바꾸면 벡터 차원이 달라질 수 있으므로 `vector(768)` 마이그레이션도 함께 조정해야 합니다.
- 더 작은 `all-minilm`도 사용할 수 있지만 벡터 차원이 384라 DB 마이그레이션 변경과 검색 품질 재검증이 필요합니다.
- 재색인은 삭제 후 삽입으로 기존 chunk를 완전히 교체합니다. 기사 내용이 바뀌어 chunk 해시가 달라져도 이전 내용의 행이 남아 계속 검색되는 문제(오래된 색인)가 생기지 않습니다.
- 동시성 제어는 스키마 변경 없이 애플리케이션 프로세스 내부의 순차 실행(직렬화)으로만 처리합니다. 여러 서버 인스턴스에서 같은 뉴스를 동시에 재색인하는 경우까지는 막지 못하므로, 다중 인스턴스 배포에서 재색인 동시 실행이 우려되면 스케줄러/큐 레벨에서 같은 뉴스에 대한 재색인 요청이 겹치지 않도록 조정해야 합니다.

## 한글 검색 품질 보정

현재 기본 임베딩 모델인 `nomic-embed-text`는 가볍고 설치가 쉽지만, 짧은 한글 쿼리에서 서로 다른 문장을 비슷한 벡터로 만드는 경우가 있습니다. 예를 들어 `축구 경기`, `날씨 폭우`, `요리 레시피` 같은 쿼리가 같은 상위 결과를 반환할 수 있습니다.

이를 줄이기 위해 `GET /news/semantic-search`는 다음 보정을 함께 수행합니다.

1. 현재 설정된 `RAG_EMBEDDING_MODEL`로 저장된 chunk만 검색합니다.
2. pgvector cosine distance로 후보를 넓게 가져옵니다.
3. 검색어 토큰이 제목, 설명, 본문, 매칭 chunk에 실제로 포함되는지 계산합니다.
4. 벡터 유사도와 키워드 일치 점수를 합쳐 재정렬합니다.
5. 토큰 일치가 없고 벡터 유사도도 충분히 높지 않은 결과는 제외합니다.

이 보정은 현재 무료 로컬 모델의 품질 한계를 줄이는 장치입니다. 한글 의미 검색 품질을 더 높이려면 한국어/다국어 임베딩 성능이 좋은 모델로 교체하고, `NewsEmbedding.embedding`의 vector 차원과 기존 색인 재생성을 함께 처리해야 합니다.
