# RAG 벡터 파이프라인

이 프로젝트의 1차 RAG 구성은 기존 Neon PostgreSQL에 `pgvector` 확장을 추가하고, 뉴스 본문 chunk 임베딩을 같은 DB에 저장하는 방식입니다.

## 구성

- 저장소: Neon PostgreSQL + `pgvector`
- 임베딩 생성: 로컬 Ollama
- 기본 임베딩 모델: `nomic-embed-text`
- 벡터 차원: `768`
- 저장 테이블: `NewsEmbedding`
- 검색 API: `GET /news/semantic-search?q=...`
- 재색인 API: `POST /news/embeddings/reindex`

## 로컬 준비

1. Ollama를 설치하고 실행합니다.
2. 임베딩 모델을 내려받습니다.

```bash
ollama pull nomic-embed-text
```

3. `my-news-back/.env`에 RAG 설정을 추가합니다.

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

운영 반영은 배포 전에 아래 명령을 사용합니다.

```bash
npm run db:migrate:deploy --workspace my-news-back
```

## 색인 흐름

뉴스 수집이 실행되면 저장된 `News` 레코드의 제목, 설명, 본문을 합쳐 chunk를 만들고 임베딩을 생성합니다.

기존 뉴스는 아래 API로 재색인합니다.

```http
POST /news/embeddings/reindex
Content-Type: application/json

{
  "limit": 50
}
```

`ENABLE_RAG_INDEXING=false`이면 자동 색인과 검색 API는 동작하지 않습니다. 로컬 Ollama가 준비되지 않은 환경에서 기존 뉴스 수집을 방해하지 않기 위한 기본값입니다.

## 검색 흐름

```http
GET /news/semantic-search?q=AI%20반도체%20전망&limit=10
```

응답의 각 뉴스 항목에는 `rag.matchedChunk`, `rag.similarity`가 포함됩니다. 이후 뉴스 상세 요약이나 RAG 기반 질의응답을 붙일 때 이 chunk를 LLM 컨텍스트로 사용합니다.

## 주의

- `NewsEmbedding.embedding`은 Prisma가 직접 지원하지 않는 PostgreSQL `vector` 타입이라 raw SQL을 사용합니다.
- 임베딩 모델을 바꾸면 벡터 차원이 달라질 수 있으므로 `vector(768)` 마이그레이션도 함께 조정해야 합니다.
- 운영 환경에서 로컬 Ollama를 직접 쓰려면 Render와 별도 GPU/CPU 서버 구성을 분리하는 편이 안전합니다.
