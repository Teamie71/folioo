# v3 deprecated API 정리 결과

기준 서버 commit: `775918ef34c90fd6d8f545e6e4251f798c1fb3af`.

서버의 HTTP API 103개 중 **32개를 제거**했습니다. 남은 71개는 사용 유지 70개와 판단을 보류한 `GET /internal/health` 1개입니다. 이 문서의 수치는 서버 라우트만 집계하며 AI 서버 자체 라우트 수와 합산하지 않습니다.

## Draft PR 스택

각 PR은 바로 앞 브랜치를 base로 삼습니다. 모두 draft이며 merge/auto-merge/배포는 수행하지 않았습니다.

| 순서 | 작업                                  | 브랜치                                | 삭제 API | PR                                                         |
| ---- | ------------------------------------- | ------------------------------------- | -------: | ---------------------------------------------------------- |
| 1    | Payment                               | `remove/payment-domain`               |        3 | [#470](https://github.com/Teamie71/folioo-server/pull/470) |
| 2    | Admin                                 | `remove/admin-domain`                 |        4 | [#471](https://github.com/Teamie71/folioo-server/pull/471) |
| 3    | Interview / 생성 콜백                 | `remove/interview-domain`             |        6 | [#472](https://github.com/Teamie71/folioo-server/pull/472) |
| 4    | Insight / Embedding                   | `remove/insight-domain`               |       10 | [#473](https://github.com/Teamie71/folioo-server/pull/473) |
| 5    | 구형 Experience / Portfolio 목록·수정 | `remove/legacy-experience-domain`     |        7 | [#474](https://github.com/Teamie71/folioo-server/pull/474) |
| 6    | Event 보상                            | `remove/event-rewards`                |        2 | [#475](https://github.com/Teamie71/folioo-server/pull/475) |
| 7    | 무참조 레거시 인프라                  | `remove/unused-legacy-infrastructure` |        0 | [#476](https://github.com/Teamie71/folioo-server/pull/476) |

## 검증

- Node 20.20.2 / pnpm 10.28.0 frozen install, build 및 변경 TypeScript lint 통과.
- 최종 전체 단위 테스트: 34 suites / 228 tests 통과. 폐기 기능 전용 테스트는 코드와 함께 제거했습니다.
- ExperienceModule 제거 후 Portfolio/ExperienceMeta → Experience 엔티티 관계를 실제 AppModule 등록 목록으로 검증하는 회귀 테스트를 추가했습니다.
- 보상 없는 약관 동의·피드백 저장, 폼/이벤트 불일치·비활성 기간·저장 실패와 과거 보상 이력 보존 회귀 테스트를 추가했습니다.
- 단계별 AST 라우트 비교 및 실제 Swagger 71개 일치를 확인했습니다.
- 격리 PostgreSQL/Redis에서 실제 AppModule과 사용자 JWT/Internal API key로 32개 제거 경로의 404를 확인했습니다.
- 피드백 반복·동시 첫 제출, 약관 동의 후 ACTIVE 전환 및 보상 참여 미생성, 기존 공개/내부 Portfolio 원문 조회, 경험맵 초기 조회, Swagger Basic Auth를 확인했습니다. schema/DI를 포함해 11개 항목 통과했습니다.
- GitHub CI: #470은 SUCCESS. 부모 feature 브랜치를 base로 하는 후속 PR은 현재 자동 체크가 없어 위 최상단 로컬 검증 결과를 따릅니다.
- 원본 Dockerfile로 최종 production 이미지 빌드 통과 (`docker build --pull=false --progress=plain -t folioo-v3-cleanup:review .`).

DB 검증은 새 임시 DB에 ORM 스키마를 만들고 기존 migration 전용 세션 복합 unique 제약과 timestamp 기본값을 보충한 fixture를 사용했습니다. **전체 migration을 처음부터 재실행한 검증은 아닙니다.** 실제 dev/prod DB와 운영 Redis에는 연결하지 않았습니다.

## 유지 및 후속 확인

- Experience의 HTTP 업무 모듈은 제거했지만 기존 Portfolio/경험맵 FK와 조회 응답에 필요한 Experience 엔티티·enum·컬럼은 유지했습니다.
- 공개/내부 Portfolio 단건 GET, 현재 첨삭/외부 PDF·경험맵·카카오 연동과 AI JSON GET/POST/PDF client를 유지했습니다.
- 피드백은 기존 Event/Participation FK, 활성 이벤트 기간과 폼 일치 검증을 유지합니다. EventModule은 데이터 연결용 최소 서비스/엔티티가 남습니다. `rewardGranted`는 호환을 위해 항상 false입니다.
- 과거 DB 테이블/데이터/기존 migration은 삭제하거나 수정하지 않았습니다. Event 데이터 모델 완전 분리는 별도 migration 작업입니다.
- Swagger의 express-basic-auth, timezone 처리의 luxon, 공용 AI client가 반환하는 기존 오류 코드를 유지했습니다.
- 실제 AI 네트워크·브라우저 전체 회귀·운영 데이터 backfill은 수행하지 않았습니다. 서버 제거 배포 시 구형 소비자 배포 반영과 실행 중인 구형 AI 작업/콜백 종료, 외부 PayApp webhook 설정 종료를 확인해야 합니다.

## 제거한 API 32개

```text
DELETE /experiences/:experienceId
DELETE /insights/:insightId
DELETE /insights/tags/:tagId
GET /admin/api/events/manual-reward-options
GET /admin/api/users/search
GET /admin/dashboard
GET /events/:eventCode/feedback-modal
GET /experiences
GET /experiences/:experienceId
GET /insights
GET /insights/summary
GET /insights/tags
GET /internal/insights/:insightId
GET /internal/insights/search
GET /interview/experiences/:experienceId/status
GET /payments/:paymentId
GET /portfolios
PATCH /experiences/:experienceId
PATCH /insights/:insightId
PATCH /internal/portfolios/:portfolioId
PATCH /portfolios/:portfolioId
POST /admin/api/events/:eventCode/grants
POST /events/:eventCode/reward-claim
POST /experiences
POST /insights
POST /insights/tags
POST /interview/experiences/:experienceId/extend/stream
POST /interview/experiences/:experienceId/messages/stream
POST /interview/experiences/:experienceId/portfolio/generate
POST /interview/experiences/:experienceId/session/stream
POST /payments/:paymentId/cancel
POST /payments/webhook
```

## 현재 서버 API 71개

`GET /internal/health`는 별도 판단 대상으로 남겨 두었습니다. 나머지 70개가 이번 정리의 유지 대상입니다.

```text
DELETE /experience-map/blocks/:blockId
DELETE /external-portfolios/:portfolioId
DELETE /portfolio-corrections/:correctionId
DELETE /users/me
GET /api/v1/experience-map/activity-status
GET /api/v1/experience-map/commit/:requestId
GET /api/v1/experience-map/templates
GET /api/v1/experience-map/usage
GET /assessments/:uuid
GET /assessments/status
GET /auth/google
GET /auth/google/callback
GET /auth/kakao
GET /auth/kakao/callback
GET /auth/naver
GET /auth/naver/callback
GET /corrections/:correctionId
GET /corrections/:correctionId/rag-data
GET /experience-map
GET /external-portfolios
GET /feedbacks/feedback-form
GET /health
GET /internal/health
GET /internal/portfolios/:portfolioId
GET /kakao-channel/link/callback
GET /kakao-channel/link/status
GET /portfolio-corrections
GET /portfolio-corrections/:correctionId
GET /portfolio-corrections/:correctionId/company-insight
GET /portfolio-corrections/:correctionId/status
GET /portfolios/:portfolioId
GET /templates
GET /users/me
PATCH /corrections/:correctionId/company-insight
PATCH /corrections/:correctionId/result
PATCH /corrections/:correctionId/status
PATCH /experience-map/blocks/:blockId
PATCH /experience-map/blocks/:blockId/position
PATCH /external-portfolios/:portfolioId
PATCH /portfolio-corrections/:correctionId
PATCH /portfolio-corrections/:correctionId/company-insight
PATCH /users/me
PATCH /users/me/marketing-consent
POST /api/v1/experience-map/activity-status/:blockId/seen
POST /api/v1/experience-map/commit
POST /api/v1/experience-map/revert
POST /api/v1/experience-map/ticket
POST /api/v1/experience-map/ticket/read
POST /api/v1/experience-map/usage/failed
POST /api/v1/kakao/turn-complete
POST /assessments
POST /assessments/:uuid/claim
POST /assessments/values-balance/next-question
POST /auth/logout
POST /auth/refresh
POST /corrections/:correctionId/rag-data
POST /experience-map/blocks
POST /external-portfolios
POST /external-portfolios/extract
POST /feedbacks/feedback-responses
POST /internal/corrections/:correctionId/pdf-extraction-result
POST /kakao-channel/link
POST /kakao-channel/link/authorize
POST /kakao/skill/activities
POST /kakao/skill/chat
POST /kakao/skill/select-activity
POST /portfolio-corrections
POST /portfolio-corrections/:correctionId/company-insight
POST /portfolio-corrections/:correctionId/generate
POST /portfolio-corrections/:correctionId/select
POST /users/me/terms
```
