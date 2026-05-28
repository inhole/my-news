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
3. 각 chunk를 Ollama `/api/embeddings`에 전달합니다.
4. 응답으로 받은 벡터를 `NewsEmbedding.embedding`에 저장합니다.
5. 같은 chunk는 `chunkHash`로 중복 저장을 막습니다.

기존 뉴스는 아래 API로 재색인합니다.

```http
POST /news/embeddings/reindex
Content-Type: application/json

{
  "limit": 50
}
```

## 검색 흐름

프론트에서 의미 검색을 선택하면 아래 API를 호출합니다.

```http
GET /news/semantic-search?q=AI%20반도체%20전망&limit=10
```

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
```

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
