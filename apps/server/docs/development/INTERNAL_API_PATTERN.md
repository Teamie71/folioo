# Internal API Pattern

This document defines the baseline pattern for internal-only APIs used by AI server callbacks.

## Goals

- Keep public JWT APIs and internal API-key APIs separated.
- Avoid editing existing public controllers when adding internal integration routes.
- Keep authentication explicit and auditable.

## Routing Rule

- Internal routes must use the prefix: `/internal/*`
- Public user routes remain unchanged (`/portfolios`, `/portfolio-corrections`, ...)

## Auth Rule

- Internal routes must use `X-API-Key`.
- Internal routes must apply both:
    - `@Public()` (bypass global JWT guard)
    - `@UseGuards(InternalApiKeyGuard)` (enforce API key)

## Controller Rule

- Add internal endpoints in dedicated controllers under `src/modules/*/presentation/internal-*.controller.ts`
- Do not mix internal callback endpoints into existing public controllers.

## Error Rule

- Use existing `BusinessException` and `ErrorCode`.
- Auth failure returns `ErrorCode.UNAUTHORIZED` (`401`).

## Environment Contract

- `MAIN_BACKEND_API_KEY`: validated by main backend internal APIs.
- `AI_SERVICE_API_KEY`: used by main backend when calling AI server.
- `AI_BASE_URL`: base URL for main backend -> AI calls.

AI server side:

- `MAIN_BACKEND_URL`: base URL for AI -> main backend calls.
- `MAIN_BACKEND_API_KEY`: key sent in `X-API-Key` for AI -> main backend calls.
- `AI_SERVICE_API_KEY`: key validated by AI server for main backend -> AI calls.
