# AI 이관 후 API·전용 코드 정리

작성자: 최진혁

최초 작성일: 2026-10-30

## 수정 이력

| 날짜 | 수정자 | 수정 내용 |
|---|---|---|
| 2026-10-30 | 최진혁 | 최초 작성 |

> 기준일: 2026-10-30

PR3에서 정리한 범위는 PPTX 생성, 구형 인터뷰 → 포트폴리오 생성,
미사용 첨삭 보조 API입니다. 조사한 프론트·백엔드 호출부와 합의한 유지 목록을 기준으로
AI 진입점 23개 및 전용 코드를 제거했습니다. 다른 저장소의 백엔드 API를 삭제한 작업은 아닙니다.

## 1. PPTX 생성 워커 제거

포트폴리오를 슬라이드로 만들고 수정하는 기능과 전용 실행·배포·템플릿·검사 코드를 제거했습니다.

| 삭제 API | 역할 |
|---|---|
| `POST /tasks/visualizations/generate` | 슬라이드 생성 작업 |
| `POST /tasks/visualizations/regenerate` | 슬라이드 재생성 작업 |

| 주요 삭제 경로 | 내용 |
|---|---|
| `apps/pptx-worker/` | 워커 서버·작업 처리 |
| `features/visualization/` | 슬라이드 생성·편집·백엔드 시각화 클라이언트 |
| `templates/`, `scripts/templates/` | PPTX 출력 템플릿·관리 도구 |
| `deploy/pptx-worker/` | 워커 배포 설정 |
| `tests/test_pptx_worker/`, `tests/test_features/test_visualization/` | 전용 테스트 |
| PPTX 전용 문서·태스크 | 구현 계획·인수인계·운영 문서 |

`pyproject.toml`의 전용 의존성을 제거하고 `uv.lock`을 갱신했습니다.
경험맵의 PPTX **입력 읽기**, PDF·이미지·DOCX 처리와 공유 스토리지 기능은 유지합니다.
코드 삭제가 기존 클라우드 워커·배포 트리거의 운영 중단을 뜻하지는 않습니다.

## 2. 구형 인터뷰 → 포트폴리오 생성 제거

경험을 질문·답변으로 수집하는 구형 인터뷰와, 그 결과로 포트폴리오를 만드는 흐름을 제거했습니다.
현재 경험맵의 대화·정리 기능과 첨삭용 PDF 추출은 별도 기능으로 유지합니다.

인터뷰 API의 공통 경로는 `/api/v1/interview`입니다.

| HTTP | 삭제 경로 |
|---|---|
| POST | `/sessions` |
| POST | `/sessions/stream` |
| POST | `/sessions/{session_id}/chat` |
| POST | `/sessions/{session_id}/chat/stream` |
| POST | `/sessions/{session_id}/extend` |
| POST | `/sessions/{session_id}/extend/stream` |
| GET | `/sessions/{session_id}/state` |
| GET | `/sessions/{session_id}/status` |

구형 포트폴리오 API의 공통 경로는 `/api/v1/portfolio`입니다.

| HTTP | 삭제 경로 |
|---|---|
| POST | `/generate` |
| GET | `/session/{session_id}` |
| GET | `/{portfolio_id}` |
| PATCH | `/{portfolio_id}/contribution-rate` |
| GET | `/{portfolio_id}/status` |

주요 정리 내용:

- `app/api/v1/interview.py`, `portfolio.py`와 전용 API 스키마 제거
- `features/interview/`의 그래프·질문·분석·검색·서비스 제거
- `features/portfolio/`의 구형 생성·저장·서비스 코드 제거, `pdf_extraction/` 유지
- `common/main_server/`의 구형 인사이트·포트폴리오 클라이언트 제거
- 라우터 등록·서버 초기화·`langgraph.json`의 구형 그래프 등록 정리
- 공유 `ErrorResponse`를 `app/schemas/common.py`로 분리
- 전용 스크립트·테스트·문서·환경변수 안내 정리

구형 AI의 백엔드 인사이트 조회·검색과 포트폴리오 PATCH 호출도 제거했습니다.
백엔드 저장소의 해당 호환 경로 제거 여부는 이전 배포 소비자가 종료됐는지 확인한 뒤 별도로 결정합니다.

## 3. 미사용 첨삭 보조 API 제거

사용자용 조회·수정은 프론트 → 메인 백엔드 흐름에서 처리합니다.
동일 역할로 AI에 남아 있던 미사용 진입점과, 별도 소비자가 확인되지 않은
구형 재시도·PDF 스트리밍 진입점을 제거했습니다. 8개 모두 단순 중계 API였던 것은 아닙니다.

공통 경로는 `/api/v1/corrections/{correction_id}`입니다.

| HTTP | 삭제 경로 | 기존 역할 |
|---|---|---|
| GET | 기본 경로 | 첨삭 조회 |
| GET | `/status` | 첨삭 상태 조회 |
| GET | `/company-insight` | 기업 분석 조회 |
| PATCH | `/company-insight` | 기업 분석 수정 |
| PATCH | `/emphasis-points` | 강조 포인트 수정 |
| DELETE | 기본 경로 | 첨삭 삭제 |
| POST | `/retry` | 구형 첨삭 재시도 |
| POST | `/pdf-extraction/stream` | PDF 추출 결과의 실시간 SSE 전달 |

주요 수정 내용:

- `app/api/v1/correction.py`: 위 핸들러 제거, 유지 API 3개만 제공
- `app/schemas/correction.py`: 전용 요청·응답 스키마 제거
- `features/correction/service.py`, `rag/pipeline.py`: 구형 재시도와 전용 실행 경로 제거
- `features/portfolio/pdf_extraction/`: 스트리밍 생성·서비스·파서 제거, 비동기 추출 유지
- `common/clients/correction_client.py`: 미사용 강조 포인트 PATCH·첨삭 DELETE 메서드 제거
- `common/sse/constants.py`: PDF 전용 상수 제거, 경험맵 SSE 유지
- 테스트: 삭제 API 미등록 검사·유지 클라이언트 계약 검증 보강
- 경험맵 서비스 테스트: 로컬 환경변수에 따라 실제 백엔드로 나가던 실패 보고를 대역으로 분리

## 유지한 기능과 호출 방향

| 흐름 | 유지 기능 |
|---|---|
| 프론트 → AI | 경험맵 chat·retry SSE, 메시지·상태·요청 조회, 취소 |
| 백엔드 → AI | 경험맵 세션 생성, 카카오 턴 접수·조회 |
| 백엔드 → AI | 첨삭 `POST /rag`, `/generate`, `/pdf-extraction` |
| AI → 백엔드 | 첨삭 입력·포트폴리오 원문 조회, 기업 분석·검색 자료·상태·결과 저장, PDF 콜백 |
| AI → 백엔드 | 경험맵 commit·복구 조회·템플릿·실패 사용량 보고, 카카오 완료 보고 |
| 운영 | `/health`, DB 연결·checkpointer |

예를 들어 AI 진입점 `GET /api/v1/corrections/{id}`는 제거했지만,
AI가 메인 백엔드에 보내는 `GET /corrections/{id}`는 유지합니다.
첨삭용 `common/clients/portfolio_client.py`의 `GET /internal/portfolios/{id}`도 유지합니다.
세션 생성의 `/sessions`와 `/api/v1/experience-map/sessions` 별칭도 유지합니다.
현재 계약은 [경험맵 API](experience-map-api-spec.md)와 [첨삭 API](correction-api.md)를 참고하세요.

## 검증 결과와 남은 항목

PR3의 기능 정리 커밋에 대해 다음을 확인했습니다.

- 사용자 환경의 DB 포함 `check:all`: AI 자동 테스트 1097개 통과
- 실제 백엔드 인증·첨삭 입력·선택 원문 조회 성공
- 실제 RAG 실행과 기업 분석의 백엔드 저장 성공
- 실제 PDF 추출·구조화와 첨삭·총평 생성 성공: 백엔드 쓰기는 로컬 JSON 캡처로 대체

추가 문서 정리 이후의 점검·CI 결과는 해당 PR에 기록합니다. 위 테스트 수가 모든 후속 커밋의 실행을 뜻하지 않습니다.

남은 연동 검증은 백엔드의 사전 준비를 포함한 PDF 콜백 저장·화면 표시와,
첨삭 결과·완료 상태 저장·화면 재조회입니다. 직접 AI를 호출하면 백엔드의 PDF 상태 또는
첨삭 결과 저장 항목이 준비되지 않아 저장이 거절될 수 있습니다.

PR 병합·배포·운영 워커 중단 여부는 코드 검증과 별도로 확인해야 합니다.
