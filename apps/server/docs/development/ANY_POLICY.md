# any Policy (Phased Enforcement)

## Goal

- Prevent `any` from being introduced into the codebase.
- Gradually tighten TypeScript compiler settings without breaking CI.

## Current Enforcement (Phase 1)

Explicit `any` is blocked by ESLint:

- Config: `eslint.config.mjs`
- Rule: `@typescript-eslint/no-explicit-any: error`

Preferred replacements:

- Use `unknown` + runtime narrowing instead of `any`.
- Use proper generics when the type is known.
- For JSONB payloads, prefer `Record<string, unknown>` (or a typed interface).

## Next Steps (Phase 2)

TypeScript compiler still allows implicit `any` today:

- Config: `tsconfig.json` has `noImplicitAny: false`

Plan:

1. Identify implicit-any hotspots (by module / pattern).
2. Enable `noImplicitAny: true` behind a dedicated check (or gradually by migration PRs).
3. Convert implicit `any` to `unknown` or concrete types.
