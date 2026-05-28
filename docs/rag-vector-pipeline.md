# RAG 벡터 파이프라인

이 프로젝트의 RAG 구성은 기존 Neon PostgreSQL에 `pgvector` 확장을 추가하고, 뉴스 본문 chunk 임베딩을 같은 DB에 저장하는 방식입니다.

## 구성

- 저장소: Neon PostgreSQL + `pgvector`
- 임베딩 생성: Ollama `nomic-embed-text`
- 벡터 차원: `768`
- 저장 테이블: `NewsEmbedding`
- 요약 캐시 테이블: `NewsLlmSummary`
- 검색 API: `GET /news/semantic-search?q=...`
- 재색인 API: `POST /news/embeddings/reindex`
- 요약 API: `POST /news/:id/summary`

## 로컬 준비

1. Ollama를 설치하고 실행합니다.
2. 임베딩 모델과 요약 모델을 내려받습니다.

```bash
ollama pull nomic-embed-text
ollama pull qwen3:1.7b
```

3. `my-news-back/.env`에 RAG와 요약 설정을 추가합니다.

```env
ENABLE_RAG_INDEXING=true
RAG_EMBEDDING_PROVIDER=ollama
RAG_EMBEDDING_MODEL=nomic-embed-text
RAG_CHUNK_SIZE=1200
RAG_CHUNK_OVERLAP=160
OLLAMA_BASE_URL=http://localhost:11434
ENABLE_LOCAL_LLM_SUMMARY=true
LOCAL_LLM_MODEL=qwen3:1.7b
LOCAL_LLM_SUMMARY_MAX_INPUT=6000
```

## DB 반영

마이그레이션은 `pgvector` 확장, `NewsEmbedding` 테이블, HNSW 인덱스, `NewsLlmSummary` 테이블을 생성합니다.

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

`ENABLE_RAG_INDEXING=false`이면 자동 색인과 검색 API는 동작하지 않습니다. Ollama가 준비되지 않은 환경에서 기존 뉴스 수집을 방해하지 않기 위한 기본값입니다.

## 검색 흐름

```http
GET /news/semantic-search?q=AI%20반도체%20전망&limit=10
```

응답의 각 뉴스 항목에는 `rag.matchedChunk`, `rag.similarity`가 포함됩니다. 이후 뉴스 상세 요약이나 RAG 기반 질의응답을 붙일 때 이 chunk를 LLM 컨텍스트로 사용할 수 있습니다.

## 로컬 LLM 요약

뉴스 상세 화면의 AI 요약 버튼은 아래 API를 호출합니다.

```http
POST /news/{id}/summary
Content-Type: application/json

{
  "refresh": false
}
```

요약은 `NewsLlmSummary` 테이블에 저장됩니다. 같은 기사 본문과 같은 모델이면 캐시된 요약을 재사용하고, `refresh=true`이면 다시 생성합니다.

## 운영 환경 판단

무료 Render Web Service에서 Ollama와 로컬 LLM 모델을 직접 실행하는 구성은 권장하지 않습니다. 무료 인스턴스는 메모리/CPU가 작고, spin down 및 임시 파일시스템 제약 때문에 모델 파일 유지와 안정적인 추론이 어렵습니다.

무료 운영 환경에서는 기본적으로 아래처럼 둡니다.

```env
ENABLE_RAG_INDEXING=false
ENABLE_LOCAL_LLM_SUMMARY=false
```

RAG 검색만 운영에서 사용하려면 embedding 생성 작업을 로컬 또는 별도 LLM 서버에서 처리하고, Render API는 Neon에 저장된 embedding을 검색하는 역할로 제한하는 편이 안전합니다.

자세한 운영 판단과 대안은 `docs/rag-local-llm-production-review.md`를 참고합니다.

## 모델 선택 기준

기본 요약 모델은 `qwen3:1.7b`입니다. Ollama 라이브러리 기준 약 1.4GB 모델이고, Qwen3 계열은 100개 이상 언어 지원을 제공하므로 한국어 뉴스 요약용 저비용 기본값으로 사용합니다.

임베딩 모델은 현재 `nomic-embed-text`를 유지합니다. 더 작은 `all-minilm`도 사용할 수 있지만 벡터 차원이 384로 달라져 `NewsEmbedding.embedding vector(768)` 마이그레이션을 바꿔야 하고, 한국어 뉴스 검색 품질도 다시 검증해야 합니다.

## 주의

- `NewsEmbedding.embedding`은 Prisma가 직접 지원하지 않는 PostgreSQL `vector` 타입이라 raw SQL을 사용합니다.
- 임베딩 모델을 바꾸면 벡터 차원이 달라질 수 있으므로 `vector(768)` 마이그레이션도 함께 조정해야 합니다.
- 요약 모델은 생성형 LLM이므로 임베딩 모델과 별도로 관리합니다.
- 운영에서 로컬 LLM을 꼭 써야 한다면 Render 무료 서비스가 아니라 별도 유료 CPU/GPU 서버 또는 외부 LLM API를 검토합니다.
