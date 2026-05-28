# 로컬 LLM 뉴스 요약

이 문서는 뉴스 상세 화면의 AI 요약 기능만 다룹니다. RAG 벡터 검색은 `docs/rag-vector-pipeline.md`를 참고합니다.

## 구성

- LLM 런타임: Ollama
- 기본 요약 모델: `qwen3:1.7b`
- 요약 캐시 테이블: `NewsLlmSummary`
- 요약 API: `POST /news/:id/summary`
- 프론트 노출 위치: 뉴스 상세 화면 AI 요약 영역

## 로컬 준비

1. Ollama를 설치하고 실행합니다.
2. 요약 모델을 내려받습니다.

```bash
ollama pull qwen3:1.7b
```

3. `my-news-back/.env`에 로컬 LLM 요약 설정을 추가합니다.

```env
ENABLE_LOCAL_LLM_SUMMARY=true
OLLAMA_BASE_URL=http://localhost:11434
LOCAL_LLM_MODEL=qwen3:1.7b
LOCAL_LLM_SUMMARY_MAX_INPUT=6000
```

## DB 반영

요약 캐시는 `NewsLlmSummary` 테이블에 저장됩니다.

```bash
npm run db:migrate:dev --workspace my-news-back
npm run db:generate --workspace my-news-back
```

운영 반영은 배포 전에 아래 명령을 사용합니다.

```bash
npm run db:migrate:deploy --workspace my-news-back
```

## API 흐름

뉴스 상세 화면의 AI 요약 버튼은 아래 API를 호출합니다.

```http
POST /news/{id}/summary
Content-Type: application/json

{
  "refresh": false
}
```

처리 흐름:

1. `News.title`, `News.description`, `News.content`를 합쳐 요약 입력을 만듭니다.
2. 입력 본문의 hash를 계산합니다.
3. 같은 기사, 같은 모델, 같은 본문 hash의 캐시가 있으면 `NewsLlmSummary`를 재사용합니다.
4. 캐시가 없거나 `refresh=true`이면 Ollama `/api/generate`로 새 요약을 생성합니다.
5. 응답은 3줄 요약 형태로 프론트에 표시합니다.

## 모델 선택 기준

기본 요약 모델은 `qwen3:1.7b`입니다.

선택 이유:

- Ollama 라이브러리 기준 약 1.4GB 모델이라 `qwen2.5:3b`보다 가볍습니다.
- Qwen3 계열은 100개 이상 언어 지원을 제공해 한국어 뉴스 요약에 더 적합합니다.
- `llama3.2:1b`보다 크지만, 한국어 출력 안정성과 요약 품질을 고려하면 더 현실적인 저비용 기본값입니다.

더 낮은 리소스가 필요하면 `llama3.2:1b` 또는 `qwen3:0.6b`를 테스트할 수 있습니다. 다만 한국어 요약 품질은 반드시 직접 확인해야 합니다.

## 운영 환경 판단

무료 Render Web Service에서 Ollama와 로컬 LLM 모델을 직접 실행하는 구성은 권장하지 않습니다. 무료 인스턴스는 메모리/CPU가 작고, spin down 및 임시 파일시스템 제약 때문에 모델 파일 유지와 안정적인 추론이 어렵습니다.

무료 운영 환경에서는 기본적으로 아래처럼 둡니다.

```env
ENABLE_LOCAL_LLM_SUMMARY=false
```

운영에서 요약이 꼭 필요하면 외부 LLM API 또는 별도 Ollama 서버를 붙입니다.

자세한 운영 판단과 대안은 `docs/rag-local-llm-production-review.md`를 참고합니다.

## 주의

- 요약 기능은 생성형 LLM을 사용하므로 임베딩 모델과 별도로 관리합니다.
- 모델을 바꾸면 기존 캐시와 다른 결과가 생기므로 `refresh=true`로 재생성해야 합니다.
- `qwen3` 계열의 thinking 출력이 섞일 수 있어 백엔드에서 `<think>...</think>` 블록을 제거합니다.
