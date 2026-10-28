# Folioo AI

Folioo AI는 사용자의 프로젝트 경험을 인터뷰로 구조화하고, 포트폴리오 문장 생성과 첨삭 보조를 제공하는 AI 백엔드입니다. FastAPI API 서버와 LangGraph 기반 인터뷰 에이전트를 중심으로 동작하며, 메인 NestJS 백엔드와 연동됩니다.

## 주요 기능

- 인터뷰 세션 생성, 상태 조회, 단계별 대화 진행
- SSE 기반 AI 응답 토큰 스트리밍
- PDF/이미지 업로드를 포함한 인터뷰 답변 처리
- 인터뷰 완료 후 포트폴리오 결과 생성
- 자기소개서/포트폴리오 첨삭 RAG 및 기업 분석 보조
- PostgreSQL checkpointer 기반 LangGraph 세션 상태 저장

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
Node.js·pnpm은 공통 버전인 `20.20.2`·`10.33.0`을 사용합니다.

mise 설치 후 도구와 의존성을 준비합니다. macOS에서는 `brew install mise`로 설치할 수 있습니다.

```bash
mise trust
mise install
eval "$(mise activate zsh)"
pnpm install --frozen-lockfile
pnpm run ai:setup:local
```

`eval`은 현재 zsh 터미널에 지정 버전을 적용합니다. 새 터미널에서도 사용하려면
`~/.zshrc`에 같은 줄을 한 번 추가하세요. 셸을 활성화하지 않으면 각 명령 앞에 `mise exec --`를 붙입니다.

`apps/ai/.env.example`을 참고해 `apps/ai/.env`와 개발 DB를 준비한 뒤 실행합니다.
로컬 DB 준비는 [기존 개발 안내](docs/architecture/experience-map-local-dev.md)를 참고하세요.

```bash
pnpm run ai:dev
```

AI 서버는 `ai:dev`로 따로 실행합니다. 공통 `pnpm dev`에는 포함되지 않습니다.

기본 주소는 `http://127.0.0.1:8000`이며 `/health`에서 상태를 확인합니다.
`PORT`, `UVICORN_HOST`, `UVICORN_RELOAD`로 실행 옵션을 조정할 수 있습니다.

## 개발 명령어

| 명령 | 설명 |
| --- | --- |
| `pnpm run ai:setup` | 기본·개발 의존성 설치 |
| `pnpm run ai:setup:local` | 로컬 DB 도구까지 설치 |
| `pnpm run ai:dev` | 서버 실행 |
| `pnpm run ai:lint` | 린트 검사 |
| `pnpm run ai:format:check` | 포맷 검사 |
| `pnpm run ai:format` | 포맷 수정 |
| `pnpm run ai:test` | 전체 AI 테스트 |
| `pnpm run ai:check` | AI 린트·포맷·테스트 |
| `pnpm check` | 공통 검사와 AI 린트·포맷 |
| `pnpm run check:all` | 공통 검사와 AI 전체 테스트 |

테스트에는 서버용 DB와 분리한 `folioo_ai_test`를 먼저 생성합니다.

```bash
EXPMAP_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/folioo_ai_test OPENROUTER_API_KEY=ci-dummy-key pnpm run ai:check
```

`ai:test`는 DB 연결이 없으면 실패합니다. `pnpm check`에는 테스트 DB가 필요 없습니다.
AI 검사는 캐시 없이 실행하고, CI도 같은 `ai:*` 명령을 사용합니다.
위 명령은 macOS·Linux 셸 기준이며 Windows에서는 WSL을 사용합니다.

LangGraph Studio는 `apps/ai`에서 `uv run --locked langgraph dev`로 실행합니다.

## 주요 환경변수

| 변수 | 설명 |
|---|---|
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

서버 실행 후 다음 경로에서 OpenAPI 문서를 확인할 수 있습니다.

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- Health check: `/health`

## 아키텍처 문서

- `docs/architecture/sse-streaming.md`: 인터뷰 SSE 스트리밍 이벤트 프로토콜
- `docs/architecture/worker-runtime.md`: 시각화 워커 실행 환경과 큐 핸들러 패턴
- `docs/architecture/worker-spec.md`: 시각화 워커 사양과 인프라 구조
- `docs/architecture/template-system.md`: PPTX 템플릿 시스템
- `docs/architecture/ooxml-editing.md`: OOXML 편집 방식
- `docs/architecture/qa-and-guardrails.md`: QA 및 가드레일
- `docs/adr/`: 주요 아키텍처 의사결정 기록
