<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 웹 UI 구현·리뷰

- 웹 UI를 구현·이관·리뷰하기 전에 [웹 Figma 기준](./docs/design-source.md)과 [웹 UI 구현 가이드](./docs/ui-implementation.md)를 확인한다.
- Figma 시안은 기준 문서에 지정된 PC·모바일 페이지와 정책 화면 예외에서 찾는다. Jira에 프레임이 지정돼 있으면 이 범위에 속하는지 확인하고, 접근이나 판단에 필요한 정보가 부족하면 확인이 필요한 범위를 결과에 명시한다.
- 리뷰할 코드와 실행 화면은 같은 커밋에서 확인한다. 리뷰 결과에 확인한 커밋, Figma 근거, 브라우저 검증 및 미검증 범위를 남긴다.
