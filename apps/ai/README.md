# Folioo AI

Folioo AI는 대화와 파일 입력으로 경험맵을 정리하고, 포트폴리오 첨삭·RAG·PDF 추출을 제공하는 AI 백엔드입니다. FastAPI와 LangGraph를 사용하며 메인 NestJS 백엔드와 연동됩니다.

## 주요 기능

- 경험맵 세션 생성·대화·메시지·상태 조회·취소·재시도
- SSE 기반 경험맵 처리 결과 전달
- PDF·이미지·DOCX·PPTX 입력 처리
- 카카오 대화와 경험맵 연동
- 포트폴리오 첨삭·RAG·PDF 추출
- PostgreSQL checkpointer 기반 LangGraph 상태 저장

## 기술 스택

- Python 3.12+
- FastAPI, Uvicorn
- LangGraph, LangChain
- OpenRouter 호환 ChatOpenAI 클라이언트
- PostgreSQL checkpointer
- uv, Ruff, pytest

## 시작하기

아래 명령은 **저장소 루트(`folioo`)**에서 실행합니다.
Python `3.12.14`·uv `0.11.7`은 루트 `mise.toml`로 관리하고, Python 의존성은 기존 `uv.lock`을 사용합니다.
Node.js·pnpm도 루트 `mise.toml`의 공통 버전(`24.22.1`·`10.33.0`)을 사용합니다.
설치·명령 범위는 [루트 개발 안내](../../README.md)를 함께 확인하세요.

mise 설치 후 도구와 의존성을 준비합니다. macOS에서는 `brew install mise`로 설치할 수 있습니다.

```bash
mise trust
mise install
eval "$(mise activate zsh)"
pnpm install --frozen-lockfile
pnpm run ai:setup:local
```

Bash에서는 활성화 명령을 `eval "$(mise activate bash)"`로 바꿉니다.
새 터미널에서도 적용하려면 해당 줄을 zsh는 `~/.zshrc`, Bash는 `~/.bashrc`에 한 번 추가하세요.
셸을 활성화하지 않으면 각 명령 앞에 `mise exec --`를 붙입니다.

`apps/ai/.env.example`을 참고해 `apps/ai/.env`와 개발 DB를 준비한 뒤 실행합니다.
로컬 DB 준비는 [기존 개발 안내](docs/architecture/experience-map-local-dev.md)를 참고하세요.

```bash
pnpm run ai:dev
```

외부 PostgreSQL을 사용하는 경우 `pnpm run ai:setup` 후 `pnpm run ai:dev:external`로 실행합니다.
이 명령은 로컬 DB 도구(`local-db` 그룹)를 설치하지 않습니다. `.env`의 DB 주소는 별도로 설정해야 합니다.
Linux ARM64처럼 `pgserver`를 지원하지 않는 환경에서도 이 방식을 사용합니다.

AI 서버는 `ai:dev`로 따로 실행합니다. 공통 `pnpm dev`에는 포함되지 않습니다.

기본 주소는 `http://127.0.0.1:8000`이며 `/health`에서 상태를 확인합니다.
`PORT`, `UVICORN_HOST`, `UVICORN_RELOAD`로 실행 옵션을 조정할 수 있습니다.

## 개발 명령어

| 명령 | 설명 |
| --- | --- |
| `pnpm run ai:setup` | 기본·개발 의존성 설치 |
| `pnpm run ai:setup:local` | 로컬 DB 도구까지 설치 |
| `pnpm run ai:dev` | 로컬 DB 도구를 포함해 서버 실행 |
| `pnpm run ai:dev:external` | 외부 PostgreSQL 환경에서 서버 실행 |
| `pnpm run ai:lint` | 린트 검사 |
| `pnpm run ai:format:check` | 포맷 검사 |
| `pnpm run ai:format` | 포맷 수정 |
| `pnpm run ai:test` | 전체 AI 테스트 |
| `pnpm run ai:check` | AI 린트·포맷·테스트 |
| `pnpm check` | 기존 공통 포맷·린트·타입·빌드 검사 |
| `pnpm run check:all` | 공통 검사와 AI 린트·포맷·전체 테스트 |

테스트에는 서버용 DB와 분리한 `folioo_ai_test`를 먼저 생성합니다.

```bash
EXPMAP_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/folioo_ai_test OPENROUTER_API_KEY=ci-dummy-key pnpm run ai:check
```

`EXPMAP_TEST_DATABASE_URL`은 직접 `pytest`를 실행할 때도 필수입니다. 미설정 시 테스트 시작 전에 실패하며,
개발용 `DATABASE_URL`을 대신 사용하지 않습니다. 반드시 개발·운영 DB와 분리한 테스트 DB 주소를 지정하세요.
`ai:test`는 DB 연결에 실패해도 실패 처리합니다. 기존 `pnpm check`에는 AI 도구와 테스트 DB가 필요 없습니다.
AI 검사는 캐시 없이 실행하고, CI도 같은 `ai:*` 명령을 사용합니다.
위 명령은 macOS·Linux 셸 기준이며 Windows에서는 WSL을 사용합니다.

LangGraph Studio는 `apps/ai`에서 `uv run --locked langgraph dev`로 실행합니다.

## 주요 환경변수

| 변수 | 설명 |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter LLM API 키 |
| `LLM_MODEL_NAME` | 기본 LLM 모델명 |
| `PDF_EXTRACTION_MODEL_NAME` | PDF 추출용 LLM 모델명 |
| `FILE_PROCESSOR_MODEL_NAME` | 업로드 파일 처리용 LLM 모델명 |
| `DATABASE_URL` | 기본 PostgreSQL 연결 문자열 |
| `CHECKPOINT_DATABASE_URL` | LangGraph checkpointer 전용 PostgreSQL 연결 문자열. 미설정 시 `DATABASE_URL` 재사용 |
| `AI_SERVICE_API_KEY` | 메인 백엔드가 AI 서버 호출 시 사용하는 API 키 |
| `MAIN_BACKEND_URL` | 메인 NestJS 백엔드 URL |
| `MAIN_BACKEND_API_KEY` | AI 서버가 메인 백엔드 호출 시 사용하는 API 키 |
| `ALLOWED_ORIGINS` | CORS 허용 origin 목록 |
| `TAVILY_API_KEY` | 웹 검색용 Tavily API 키 |

## API 문서

첨삭은 메인 서버가 호출하는 다음 세 경로를 제공합니다.

- `POST /api/v1/corrections/{correction_id}/rag`
- `POST /api/v1/corrections/{correction_id}/generate`
- `POST /api/v1/corrections/{correction_id}/pdf-extraction`

첨삭 입력·포트폴리오 원문 조회와 결과·상태 저장은 `MAIN_BACKEND_URL`의 내부 API를 사용합니다.
사용자용 조회·수정·삭제·재시도는 메인 서버가 담당합니다.

서버 실행 후 다음 경로에서 OpenAPI 문서를 확인할 수 있습니다.

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- Health check: `/health`

## 아키텍처 문서

- `docs/architecture/experience-map-api-spec.md`: 경험맵 API·SSE 계약
- `docs/adr/`: 주요 아키텍처 의사결정 기록
