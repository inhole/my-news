# RAG 및 로컬 LLM 운영 검토

작성일: 2026-05-28

이 문서는 무료 운영 인프라에서 RAG와 로컬 LLM 기능을 사용할 수 있는지 판단합니다.

세부 기능 문서는 아래를 참고합니다.

- RAG 벡터 검색: `docs/RAG-벡터-파이프라인.md`
- 로컬 LLM 뉴스 요약: `docs/로컬-LLM-뉴스-요약.md`

## 결론

현재 무료 인프라 기준에서는 **RAG 벡터 검색은 제한적으로 가능**하고, **Render 무료 Web Service에서 로컬 LLM을 직접 실행하는 구성은 권장하지 않습니다.**

권장 운영 구성:

```text
Vercel
  -> Render Web Service: NestJS API
  -> Neon PostgreSQL: News, NewsEmbedding, NewsLlmSummary

로컬 개발 환경
  -> Ollama: embedding, summary 생성

운영 무료 환경
  -> RAG 검색은 Neon pgvector 사용
  -> LLM 요약은 비활성화 또는 외부 LLM API/별도 LLM 서버 사용
```

## RAG 운영 적합성

Neon은 Postgres 확장으로 `pgvector`를 사용할 수 있으므로 `NewsEmbedding` 구조는 무료 환경에서도 기술적으로 사용할 수 있습니다.

다만 무료 플랜은 저장공간과 compute 한도가 작기 때문에 대량 색인에는 적합하지 않습니다.

운영 제한:

- 재색인 `limit` 기본값을 작게 유지합니다.
- 기사 본문 chunk 크기를 너무 작게 쪼개지 않습니다.
- 오래된 기사 embedding 정리 정책을 둡니다.
- 의미 검색은 `limit`을 낮게 유지합니다.
- 운영 Render 서버에서 embedding 생성을 직접 수행하지 않습니다.

## 로컬 LLM 운영 적합성

Render 무료 Web Service는 백엔드 API 실행에는 사용할 수 있지만, 로컬 LLM 런타임에는 맞지 않습니다.

주요 이유:

- Free 인스턴스는 RAM 512 MB, CPU 0.1 수준이라 LLM 모델 로딩 자체가 어렵습니다.
- 15분간 요청이 없으면 spin down 되고, 다시 뜨는 데 시간이 걸립니다.
- 무료 서비스는 파일시스템이 임시 저장소라 restart, redeploy, spin down 때 로컬 모델 파일이 사라질 수 있습니다.
- 무료 서비스는 persistent disk를 붙일 수 없습니다.
- 무료 서비스는 Shell access, one-off jobs, scaling 등 운영 보조 기능 제한이 있습니다.

따라서 `ollama pull qwen3:1.7b`처럼 모델 파일을 내려받아 보관하는 방식은 Render 무료 환경과 맞지 않습니다.

## Render에서 Ollama 설치 가능성

무료 Native Runtime에서는 권장하지 않습니다.

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen3:1.7b
```

문제:

- build 시간이 길어집니다.
- 모델 파일이 커서 무료 환경에 부담이 큽니다.
- runtime filesystem이 유지되지 않습니다.
- 백엔드 API 프로세스와 Ollama 서버 프로세스를 같이 안정적으로 관리하기 어렵습니다.

유료 인스턴스에서는 Docker 이미지로 Ollama를 포함하거나 별도 서비스로 분리하는 방식을 고려할 수 있습니다.

```text
Render Web Service A
  - NestJS API

Render Web Service B 또는 별도 VM
  - Ollama
  - Persistent Disk mount: /root/.ollama
  - OLLAMA_HOST=0.0.0.0:11434
```

## 현재 코드의 무료 운영 권장 설정

```env
ENABLE_RAG_INDEXING=false
ENABLE_LOCAL_LLM_SUMMARY=false
```

RAG 검색을 운영에서 켜고 싶다면 먼저 로컬 또는 별도 관리 작업에서 embedding을 생성한 뒤, 검색만 운영 API에서 사용하도록 분리하는 편이 안전합니다.

## 참고한 공식 문서

- Render Free: https://render.com/docs/free
- Render Pricing: https://render.com/pricing
- Render Persistent Disks: https://render.com/docs/disks
- Neon plans: https://neon.com/docs/introduction/pro-plan
- Neon AI with pgvector: https://neon.com/docs/ai/ai-scale-with-neon
- Ollama Linux: https://docs.ollama.com/linux
- Ollama Docker: https://docs.ollama.com/docker
