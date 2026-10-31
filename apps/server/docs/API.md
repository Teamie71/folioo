# API Status & Smoke Testing

This document tracks:

- What APIs exist (from controllers and OpenAPI).
- Which endpoints are implemented vs not implemented.
- How to manually obtain an access token and test via Swagger.
- How to run the automated dev smoke tests.

Notes:

- In non-local environments, Swagger UI is mounted at `/docs` and protected by Basic Auth (`/docs-json` too).
- Most API endpoints are protected by a global JWT guard and require `Authorization: Bearer <accessToken>`.

## Environments

- Dev base URL: `https://dev-api.folioo.ai.kr`
- Swagger UI: `https://dev-api.folioo.ai.kr/docs`
- OpenAPI JSON: `https://dev-api.folioo.ai.kr/docs-json`
- Health check (public): `https://dev-api.folioo.ai.kr/health`

## Auth Model (How Requests Are Authorized)

- Default: global `JwtAuthGuard` is applied (all routes require access token unless explicitly public).
- Access token is read from `Authorization: Bearer <token>`.
- Refresh token is stored in an `httpOnly` cookie named `refreshToken` and used by `POST /auth/refresh`.

## Manual Testing via Swagger

### Step 1. Open Swagger UI (Basic Auth)

Open:

`https://dev-api.folioo.ai.kr/docs`

This may prompt for Basic Auth credentials (configured by `SWAGGER_USER` / `SWAGGER_PASSWORD` in non-local).

### Step 2. Do Kakao or Google login in the browser

Do NOT try to execute OAuth redirects from Swagger.

Open one of these in a new browser tab:

`https://dev-api.folioo.ai.kr/auth/kakao`

`https://dev-api.folioo.ai.kr/auth/google`

After completing the social login flow, the server sets an `httpOnly` cookie `refreshToken` and redirects to the client.

### Step 3. Issue access token using refresh cookie

Back in Swagger:

- Execute `POST /auth/refresh`
- This reads the `refreshToken` cookie and returns a new access token string in `result`

If you see `AUTH4012` (refresh token missing), your browser does not have the `refreshToken` cookie for this domain.

### Step 4. Authorize Swagger with the access token

Click the `Authorize` button and paste the access token.

Swagger will send `Authorization: Bearer <token>` for endpoints that require JWT.

## Automated Smoke Tests (Dev)

We use OpenAPI (`/docs-json`) to enumerate endpoints and fire requests against the dev server.

Script:

- `scripts/smoke-dev-api.mjs`

### Run GET-only smoke (safe)

```bash
export FOLIOO_ACCESS_TOKEN="<paste-access-token>"
node scripts/smoke-dev-api.mjs
```

### Run GET + POST/PATCH/DELETE smoke

This will hit mutating endpoints too.

```bash
export FOLIOO_ACCESS_TOKEN="<paste-access-token>"
node scripts/smoke-dev-api.mjs --mutate --exclude '^/auth/(kakao|google|naver)'
```

### Run Internal API smoke (X-API-Key)

Internal API는 JWT 대신 X-API-Key로 인증하므로 별도 플래그를 사용합니다.

```bash
export FOLIOO_INTERNAL_API_KEY="<paste-api-key>"
node scripts/smoke-dev-api.mjs --internal
```

변형 요청(PATCH/POST) 포함:

```bash
node scripts/smoke-dev-api.mjs --internal --mutate
```

### Multipart file upload endpoints

By default, multipart/form-data endpoints (e.g. PDF extract) are skipped.
To test them, provide a local file with `--file`:

```bash
node scripts/smoke-dev-api.mjs --mutate --file ./sample.pdf
```

### CLI Options

| Option               | Default                           | Description                         |
| -------------------- | --------------------------------- | ----------------------------------- |
| `--base <url>`       | `https://dev-api.folioo.ai.kr`    | Dev server base URL                 |
| `--token-env <name>` | `FOLIOO_ACCESS_TOKEN`             | Env var containing access token     |
| `--mutate`           | off                               | Enable POST/PATCH/DELETE endpoints  |
| `--internal`         | off                               | Run Internal API smoke (X-API-Key)  |
| `--internal-key-env` | `FOLIOO_INTERNAL_API_KEY`         | Env var containing internal API key |
| `--file <path>`      | _(none)_                          | Attach file to multipart endpoints  |
| `--delay-ms <n>`     | 120                               | Delay between requests (ms)         |
| `--timeout-ms <n>`   | 15000                             | Per-request timeout (ms)            |
| `--include <regex>`  | _(none)_                          | Only run paths matching regex       |
| `--exclude <regex>`  | _(none)_                          | Skip paths matching regex           |
| `--out <path>`       | `/tmp/folioo_dev_smoke_<ts>.json` | Report output path                  |

### Result Classification

Each endpoint result is classified into one of:

| Classification     | HTTP Status    | Meaning                                 |
| ------------------ | -------------- | --------------------------------------- |
| `implemented`      | 2xx            | Endpoint works correctly                |
| `not_implemented`  | 501            | Endpoint is stubbed / not yet built     |
| `validation_error` | 400            | Payload rejected by DTO validation      |
| `not_found`        | 404            | Resource not found                      |
| `auth_required`    | 401            | Authentication missing or invalid       |
| `payment_required` | 402            | Payment required                        |
| `server_error`     | 500+ (not 501) | Unexpected server error                 |
| `skipped`          | _(n/a)_        | Skipped by rule (env, multipart, OAuth) |
| `network_error`    | _(n/a)_        | Timeout or connection failure           |

### Environment-Dependent Skipping

Some endpoints are auto-skipped when prerequisite data is unavailable:

- `POST /auth/refresh` - always skipped (needs httpOnly `refreshToken` cookie, not Bearer)
- `GET /auth/kakao`, `GET /auth/google`, `GET /auth/naver`(및 callback 경로) - skipped (OAuth redirect, not meaningful as API call)
- Multipart endpoints - skipped unless `--file` is provided

### Output

The script prints a human-readable classification summary and writes a JSON report under `/tmp`.

The report includes:

- request URL
- HTTP status
- classification category (see table above)
- standardized error code (when provided)
- standardized reason (when provided)
- `classification` - aggregate count per classification category
- `buckets` - legacy HTTP status code buckets (backward-compatible)

## Current Implementation Status (Controllers)

Legend:

- IMPLEMENTED: endpoint has real logic (may still fail due to missing data)
- NOT_IMPLEMENTED: throws `BusinessException(ErrorCode.NOT_IMPLEMENTED)` -> typically `501`
- EMPTY: controller exists but no routes

### Common

- GET `/health` -> IMPLEMENTED (Public)

### Internal (X-API-Key 인증, AI 서버 연동)

> Internal API는 JWT 대신 `X-API-Key` 헤더로 인증합니다. `@Public()` + `InternalApiKeyGuard` 조합.

#### Health

- GET `/internal/health` -> IMPLEMENTED (Internal API 헬스 체크)

#### Portfolio

- GET `/internal/portfolios/{portfolioId}` -> IMPLEMENTED (포트폴리오 원문 조회, AI 첨삭 생성 시 원문 참조)

#### Correction

- GET `/corrections/{correctionId}` -> IMPLEMENTED (첨삭 데이터 조회, RAG/생성 시 company_name 등 참조)
- PATCH `/corrections/{correctionId}/status` -> IMPLEMENTED (첨삭 상태 전이: NOT_STARTED→DOING_RAG, COMPANY_INSIGHT→GENERATING 등)
- PATCH `/corrections/{correctionId}/company-insight` -> IMPLEMENTED (기업 분석 저장 + 상태→COMPANY_INSIGHT 전이)
- PATCH `/corrections/{correctionId}/result` -> IMPLEMENTED (첨삭 결과 저장 + 상태→DONE 전이)
- POST `/corrections/{correctionId}/rag-data` -> IMPLEMENTED (Tavily RAG 검색 결과 저장)
- GET `/corrections/{correctionId}/rag-data` -> IMPLEMENTED (저장된 RAG 검색 결과 조회, createdAt 오름차순)

#### Experience Map (AI 에이전트)

- POST `/api/v1/experience-map/usage/failed` -> IMPLEMENTED (실패한 턴을 일일 사용 횟수에서 제외, body: `user_id`, `request_id`, 멱등)

### Experience Map - AI 에이전트 사용 한도

- POST `/api/v1/experience-map/ticket` -> IMPLEMENTED (턴 실행용 `scope=turn` + `rid`(=request_id), 새 `request_id`면 일일 한도 1회 차감, 한도 초과 시 429 `EXPERIENCE_MAP429`)
- POST `/api/v1/experience-map/ticket/read` -> IMPLEMENTED (대화 내역 조회용 `scope=read`, 한도 차감 없음)
- GET `/api/v1/experience-map/usage` -> IMPLEMENTED (`used`/`limit`/`reset_at`, 모든 에이전트 합산 10회, KST 자정 초기화, 실패 턴 제외)
- GET `/api/v1/experience-map/activity-status` -> IMPLEMENTED (활동별 최신 요청의 `status`(running/completed/failed/cancelled)와 `seen`, `ai_experience_request` 직접 조회, lease 만료된 running은 failed)
- POST `/api/v1/experience-map/activity-status/{blockId}/seen` -> IMPLEMENTED (최신 요청을 확인 처리, 처리 중이면 기록 안 함, 멱등)

### Auth

- GET `/auth/kakao` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/kakao/callback` -> IMPLEMENTED (Public, OAuth callback)
- POST `/auth/refresh` -> IMPLEMENTED (Public, requires refreshToken cookie)
- POST `/auth/logout` -> IMPLEMENTED
- GET `/auth/google` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/google/callback` -> IMPLEMENTED (Public, OAuth callback)
- GET `/auth/naver` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/naver/callback` -> IMPLEMENTED (Public, OAuth callback)

### User

- GET `/users/me` -> IMPLEMENTED
- POST `/users/me/terms` -> IMPLEMENTED (온보딩 약관 동의, `@AllowPending()`)
- PATCH `/users/me` -> IMPLEMENTED
- PATCH `/users/me/marketing-consent` -> IMPLEMENTED
- DELETE `/users/me` -> IMPLEMENTED (soft delete + social unlink policy)
    - Provider behavior: Google/Kakao/Naver unlink uses stored OAuth refresh token (Naver/Kakao refresh access token first when needed).

### Experience

구형 경험 정리 CRUD 제거. 현재 경험맵은 유지합니다.

### Interview

구형 인터뷰 API 전체와 생성 결과 PATCH 콜백 제거. 첨삭 원문 GET은 유지합니다.

### Portfolio

- GET `/portfolios/{portfolioId}` -> IMPLEMENTED

### Portfolio-Correction

- GET `/portfolio-corrections` -> IMPLEMENTED
- POST `/portfolio-corrections` -> IMPLEMENTED (`title` required)
- GET `/portfolio-corrections/{correctionId}/status` -> IMPLEMENTED
- GET `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
- GET `/portfolio-corrections/{correctionId}` -> IMPLEMENTED (응답: `CorrectionResultResDTO`, `status: CorrectionStatus` 포함)
- POST `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
- PATCH `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
- POST `/portfolio-corrections/{correctionId}/select` -> IMPLEMENTED (선택 포트폴리오를 매핑 테이블에 활성화 상태로 저장)
- POST `/portfolio-corrections/{correctionId}/generate` -> IMPLEMENTED (요청 본문 없이 활성화된 매핑 기준으로 생성 준비 수행)
- PATCH `/portfolio-corrections/{correctionId}` -> IMPLEMENTED
- DELETE `/portfolio-corrections/{correctionId}` -> IMPLEMENTED

### External Portfolios

- GET `/external-portfolios?correctionId=...` -> IMPLEMENTED (응답: `ExternalPortfolioListResDTO` = `{ status: PdfExtractionStatus, originalFileName: string \| null, portfolios: StructuredPortfolioResDTO[] }`)
- POST `/external-portfolios` -> IMPLEMENTED
- POST `/external-portfolios/extract` -> IMPLEMENTED (multipart PDF + `correctionId`, busboy 파싱, AI 추출 후 DB 저장)
- PATCH `/external-portfolios/{portfolioId}` -> IMPLEMENTED
- DELETE `/external-portfolios/{portfolioId}` -> IMPLEMENTED

### Insight

구형 인사이트 로그/태그/요약 및 내부 검색·조회 API 제거. 현재 첨삭 기업 분석 인사이트는 유지합니다.

### Payment

결제 API 전체 제거. 과거 결제 데이터와 DB 이력은 보존합니다.

### Event

공개 피드백 보상 모달/보상 수령 API 제거. 가입·피드백 보상 지급을 종료하며 피드백 저장은 유지합니다. 피드백 응답의 rewardGranted는 호환을 위해 항상 false로 반환합니다.

### Admin

관리자 페이지·보상 지급 API·정적 자산 전체 제거.

### Assessment (직무·기업형태 추천 분석)

- POST `/assessments/values-balance/next-question` -> IMPLEMENTED (Public, 가치관 밸런스게임 진행)
- POST `/assessments` -> IMPLEMENTED (Public, 로그인 시 결과가 자동으로 계정에 연결됨)
- GET `/assessments/status` -> IMPLEMENTED (로그인 계정 기준 완료 여부/uuid 조회)
- GET `/assessments/{uuid}` -> IMPLEMENTED (Public, 비로그인 조회 시 상세 마스킹)
- POST `/assessments/{uuid}/claim` -> IMPLEMENTED (익명 생성 결과를 로그인 계정에 등록)
- 배점표/직무·기업형태 콘텐츠/헤드라인 문구는 전부 placeholder 상태 — `seeds/production/`에 실제 데이터 채우고 `pnpm seed --profile=production` 실행 필요
