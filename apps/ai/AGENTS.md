# AI 작업 안내

수정자: 최진혁

최근 수정일: 2026-10-30

## 수정 이력

| 날짜 | 수정자 | 수정 내용 |
|---|---|---|
| 2026-10-30 | 최진혁 | AI 이관 후 문서 정리·현행 안내 반영 |

> 기준일: 2026-10-30

이 문서는 `apps/ai`에 적용합니다. 설치·환경변수·명령의 상세 설명은 [README](README.md)를 참고하세요.

## 현재 구조

| 경로 | 역할 |
|---|---|
| `app/api/v1/` | FastAPI 라우터 |
| `app/schemas/` | API 요청·응답 스키마 |
| `common/` | LLM·HTTP 클라이언트, DB 연결, checkpointer |
| `features/experience_map/` | 경험맵 그래프·카카오·SSE·커밋 처리 |
| `features/correction/` | 기업 분석(RAG)·첨삭 생성 |
| `features/portfolio/pdf_extraction/` | 첨삭용 PDF 추출·구조화 |
| `scripts/experience_map/` | 로컬 DB·티켓·데모 도구 |
| `tests/` | 기능별 테스트 |
| `docs/architecture/` | 경험맵·첨삭의 핵심 API 계약 |
| `deploy/main-server/` | AI 서버 배포 안내 |

PPTX 생성 워커와 구형 인터뷰·포트폴리오 생성 API는 제거했습니다.
경험맵의 PPTX **입력 처리**는 유지합니다.

## 실행과 검사

아래 명령은 저장소 루트에서 실행합니다. 도구 버전은 루트 `mise.toml`, Python 의존성은
`apps/ai/pyproject.toml`과 `uv.lock`으로 관리합니다.

```bash
mise exec -- pnpm run ai:setup
mise exec -- pnpm run ai:dev:external
mise exec -- pnpm run ai:lint
mise exec -- pnpm run ai:format:check
```

로컬 PostgreSQL 도구도 필요하면 `ai:setup:local`·`ai:dev`를 사용합니다.
전체 AI 검사는 별도 테스트 DB 주소를 지정해 실행합니다.

```bash
EXPMAP_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/folioo_ai_test OPENROUTER_API_KEY=ci-dummy-key mise exec -- pnpm run ai:check
```

- `EXPMAP_TEST_DATABASE_URL`은 직접 pytest를 실행할 때도 필수입니다.
- 개발·운영 DB를 테스트 DB로 사용하지 마세요. 테스트는 스키마 준비와 데이터 정리를 수행합니다.
- `ai:test`·`ai:check`는 DB 연결 실패를 실패 처리합니다. LLM·외부 HTTP는 테스트 대역을 사용합니다.
- 수동 LLM 테스트는 실제 사용량이 발생하며, 자동 테스트와 별도로 결과를 기록합니다.

## 수정 원칙

- Python 3.12 타입 힌트, Ruff 포맷·import 정렬, 한국어 docstring을 사용합니다.
- 기능 코드와 테스트 구조를 맞추고, 삭제한 심볼의 import·라우터·그래프·문서 참조도 확인합니다.
- API 삭제 시 호출 방향을 구분합니다. AI 진입점 제거와 AI → 백엔드 클라이언트 제거는 별개입니다.
- 첨삭 API는 비동기 작업을 접수합니다. `202`만으로 처리·저장 성공을 판단하지 마세요.
- PDF·첨삭 결과 저장에는 백엔드의 사전 상태·저장 항목 준비가 필요합니다.
- 경험맵 테스트 UI의 메모리 실행은 실제 백엔드·GCS 연동 검증을 대체하지 않습니다.
- `.env`, 인증 키, 사용자 원문·생성 결과를 커밋하거나 로그에 출력하지 마세요.
- `docs/local-migration/`은 Git에서 제외된 개인 검증 공간입니다. 공유할 계약은 추적되는 문서에 기록합니다.
