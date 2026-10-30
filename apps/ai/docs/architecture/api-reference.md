# 현재 AI API와 기능

작성자: 최진혁

최초 작성일: 2026-10-30

## 수정 이력

| 날짜 | 수정자 | 수정 내용 |
|---|---|---|
| 2026-10-30 | 최진혁 | 최초 작성 |

> 기준일: 2026-10-30 · 현재 브랜치의 라우터·미들웨어·클라이언트 구현 기준입니다. 실제 배포 환경의 등록 여부는 설정에 따라 다릅니다.

## 범위와 인증

AI가 제공하는 서비스 API는 **14개 경로**입니다. 같은 세션 생성 기능의 호환 별칭도 경로 수에 포함합니다.
별도로 조건부 개발용 경로 5개와 문서 경로 4개가 있습니다.
아래 목록은 코드를 기준으로 하며, 현재 서버의 Swagger는 활성화된 API만 보여줍니다.

| 구분 | 인증 | 용도 |
|---|---|---|
| 메인 백엔드 → AI | `X-API-Key: AI_SERVICE_API_KEY` | 첨삭·세션 생성·카카오 |
| 프론트 → AI | `Authorization: Bearer <경험맵 전용 티켓>` | 경험맵 대화·조회·취소·재시도 |
| AI → 메인 백엔드 | `X-API-Key: MAIN_BACKEND_API_KEY` | 입력 조회·결과 저장·커밋·보고 |

사용자 로그인 access token은 위 경험맵 티켓이나 서비스 인증 키를 대신하지 않습니다.
일반 사용자용 첨삭 조회·수정·삭제 API는 메인 백엔드에서 제공합니다.

## 1. 첨삭·기업 분석·PDF: 3개

공통 경로: `/api/v1/corrections/{correction_id}`. 인증은 AI 서비스 API 키입니다.

| HTTP | 경로 | 기능 | 입력·결과 |
|---|---|---|---|
| POST | `/rag` | 기업·직무 정보를 검색하고 기업 분석 생성 | 첨삭 ID로 백엔드 입력 조회 → 검색 자료·분석 저장 |
| POST | `/pdf-extraction` | PDF를 경험·활동별 원문으로 구조화 | multipart `file` → 완료·실패 콜백으로 백엔드에 전달 |
| POST | `/generate` | 원문별 첨삭과 전체 총평 생성 | 선택 원문 1~4개와 기업·직무 정보 → 결과 저장 |

모두 `202`로 작업을 접수하고 백그라운드에서 처리합니다. 응답 body에 생성 결과를 반환하지 않습니다.
PDF의 활동 설명·담당 업무·문제 해결·배운 점 정리와, 기업·직무에 맞춘 첨삭은 별도 단계입니다.
백엔드 상태·저장 항목 준비와 자세한 입력 조건은 [첨삭 계약](correction-api.md)을 참고하세요.

## 2. 경험맵: 정식 경로 7개 + 호환 별칭 1개

`EXPERIENCE_MAP_ENABLED=true`일 때 등록됩니다.
공통 경로: `/api/v1/experience-map`.

| HTTP | 경로 | 기능 | 인증 |
|---|---|---|---|
| POST | `/sessions` | 사용자·블록에 대응하는 경험맵 세션 생성 | AI 서비스 API 키 |
| POST | `/sessions/{session_id}/chat/stream` | 메시지·첨부 파일로 경험을 정리하고 진행·결과를 SSE로 전달 | 경험맵 turn 티켓 |
| POST | `/sessions/{session_id}/retry/stream` | 실패한 요청을 재시도하고 SSE로 전달 | 해당 요청의 경험맵 turn 티켓 |
| GET | `/sessions/{session_id}/messages` | 저장된 대화 내역 조회, cursor·limit 지원 | 경험맵 티켓 |
| GET | `/sessions/{session_id}/state` | 재접속 시 세션 상태 조회 | 경험맵 티켓 |
| GET | `/sessions/{session_id}/requests/{request_id}` | 개별 요청의 진행·저장 결과 조회 및 연결 단절 후 복구 | 경험맵 티켓 |
| POST | `/sessions/{session_id}/requests/{request_id}/cancel` | 진행 중 요청에 중지 요청, 성공 시 `204` | 경험맵 티켓 |

`POST /sessions`는 정식 `POST /api/v1/experience-map/sessions`와 같은 핸들러를 사용하는
메인 백엔드 호환 별칭입니다. 기능이 추가된 것이 아니며 Swagger에서는 숨깁니다.

경험맵은 입력 분석·내용 필터·대상 활동 선택·구조화·문장 정제·검증·백엔드 커밋과 후속 질문을 처리합니다.
PDF·이미지·DOCX·PPTX 등의 **입력 처리**는 유지하며, PPTX 생성 기능과 구분합니다.
티켓의 세션·사용자·scope·요청 ID 검증과 자세한 SSE 이벤트는 [경험맵 계약](experience-map-api-spec.md)을 참고하세요.

## 3. 카카오: 2개

`EXPERIENCE_MAP_ENABLED=true`일 때 등록됩니다. 두 경로 모두 AI 서비스 API 키를 사용합니다.

| HTTP | 전체 경로 | 기능 |
|---|---|---|
| POST | `/sessions/{session_id}/kakao/turns` | 카카오 대화 턴을 영속 접수, `202` 반환 후 처리 |
| GET | `/kakao/turns/{request_id}` | 턴 상태·결과 조회, `user_id` 쿼리 필요 |

같은 요청 ID·본문 재접수는 멱등 처리하며 다른 본문 충돌은 거절합니다.
카카오 콜백 응답과 메인 백엔드 완료 보고를 수행합니다.
`KAKAO_WEB_EXPERIENCE_URL`이 없으면 카카오 턴 접수가 거절됩니다. 이 값은 카카오 버튼이 열 실제 프론트 화면의 HTTPS 주소입니다.

## 4. 상태 확인: 1개

| HTTP | 경로 | 인증 | 기능 |
|---|---|---|---|
| GET | `/health` | 없음 | 서버 버전·checkpointer·경험맵 DB·메인 서버 클라이언트·API 키 설정 상태 |

`main_server` 값은 클라이언트 초기화 상태이며 실제 백엔드 HTTP 요청 성공을 보장하지 않습니다.

## 5. 개발·데모 전용: 조건부 5개

서비스 API 개수와 별도로 집계합니다. 실제 운영 계약이나 저장 연동 검증을 대신하지 않습니다.

| 조건 | HTTP | 전체 경로 | 기능·인증 |
|---|---|---|---|
| `EXPERIENCE_MAP_DEMO_MODE=true` | POST | `/api/v1/experience-map/demo/run` | 외부 LLM·DB·백엔드 없는 고정 데모. AI 서비스 API 키 |
| `EXPERIENCE_MAP_TEST_UI_ENABLED=true` | GET | `/experience-map/test` | 내부 테스트 HTML 페이지. 페이지 자체는 인증 제외 |
| 위와 같음 | POST | `/experience-map/test/session` | 테스트 맵 초기화·세션 및 read 티켓 발급. 핸들러에서 AI 키 검사 |
| 위와 같음 | POST | `/experience-map/test/ticket` | chat·retry용 turn 티켓 발급. AI 키 필요 |
| 위와 같음 | GET | `/experience-map/test/map/{user_id}` | 테스트 메모리 맵 조회. AI 키 필요 |

테스트 UI는 맵·커밋·업로드를 메모리 실행기로 대체합니다. 실제 채팅에는 별도로 경험맵 API 활성화와
DB·LLM 등 실행 설정이 필요합니다. 메모리 데이터는 재시작하면 사라지고 DB 세션·요청 기록과는 구분됩니다.

## 6. 문서 경로: 4개

| HTTP | 경로 | 기능·인증 |
|---|---|---|
| GET | `/docs` | Swagger UI. 인증 제외, API 실행 인증은 별도 |
| GET | `/openapi.json` | OpenAPI 스키마. 인증 제외 |
| GET | `/docs/oauth2-redirect` | Swagger OAuth 리다이렉트 보조 페이지. 인증 제외 |
| GET | `/redoc` | ReDoc. 현재 미들웨어에서는 AI 서비스 API 키 필요 |

## 7. AI가 호출하는 메인 백엔드 계약: 13개

아래는 **AI가 제공하는 API가 아니라 외부 백엔드로 보내는 요청**입니다.
대상 주소는 `MAIN_BACKEND_URL`, 인증은 `MAIN_BACKEND_API_KEY`입니다.

| HTTP | 백엔드 경로 | 용도 |
|---|---|---|
| GET | `/corrections/{id}` | 기업·직무·공고·기업 분석·선택 원문 ID 등 첨삭 입력 조회 |
| PATCH | `/corrections/{id}/status` | 첨삭 상태 변경 |
| PATCH | `/corrections/{id}/company-insight` | 기업 분석 저장 |
| POST | `/corrections/{id}/rag-data` | 검색 키워드·결과 저장 |
| GET | `/corrections/{id}/rag-data` | 저장 검색 자료 조회 계약. 클라이언트 유지, 정상 생성 흐름의 필수 단계는 아님 |
| PATCH | `/corrections/{id}/result` | 첨삭·총평 저장 및 완료 상태 전환 |
| POST | `/internal/corrections/{id}/pdf-extraction-result` | PDF 완료·실패 결과 전달 |
| GET | `/internal/portfolios/{id}` | 첨삭 원문 조회 |
| POST | `/api/v1/experience-map/commit` | 경험맵 변경 위임 |
| GET | `/api/v1/experience-map/commit/{request_id}` | 커밋 응답 유실 시 결과 복구 |
| GET | `/api/v1/experience-map/templates` | 경험맵 템플릿 카탈로그 조회 |
| POST | `/api/v1/experience-map/usage/failed` | 실패 사용량 보고 |
| POST | `/api/v1/kakao/turn-complete` | 카카오 턴 완료 보고 |

삭제된 API와 전용 코드 범위는 [이관 정리 내역](api-cleanup.md)을 참고하세요.
