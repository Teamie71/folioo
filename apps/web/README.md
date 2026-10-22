# Web 개발 환경

## 실행

저장소 루트에서 실행합니다. Node 버전과 CI는 공통 환경 담당자가 관리합니다.

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
pnpm exec turbo run build --filter=@folioo/bud-tokens
pnpm --filter @folioo/web dev
```

루트 `pnpm dev`는 Turbo의 의존 그래프를 통해 토큰 빌드를 선행합니다.
웹만 직접 실행할 때는 위처럼 토큰을 먼저 빌드해야 합니다.

```sh
pnpm --filter @folioo/web lint
pnpm exec turbo run check-types build --filter=@folioo/web
pnpm --filter @folioo/web start
```

## 컴파일 경계

- 웹의 `.css.ts`는 `@vanilla-extract/next-plugin`과 Webpack으로 컴파일합니다.
- `dev`와 `build` 모두 `--webpack`을 사용합니다. Turborepo와는 별개의 선택입니다.
- BUD는 공개 진입점 `@folioo/bud-tokens`와 `@folioo/bud-tokens/style.css`만 사용합니다.
- BUD의 `src`나 `dist` 내부 파일을 직접 import하지 않습니다.
- 토큰 값과 테마 계약은 BUD가 소유하고 `src/styles/theme.ts`에서 재노출합니다.
  웹에서 별도의 색상·간격 계약이나 토큰 원본을 만들지 않습니다.
- 현재 토큰은 `:root` 단일 테마입니다. 다크 모드와 폰트 파일 로딩은 이 설정에 포함하지 않습니다.

## CSS 우선순위

일반 선언은 `theme → base → components → utilities` 순서로 우선합니다.

- `theme`: Tailwind 테마와 BUD의 CSS 변수·텍스트 클래스
- `base`: Tailwind Preflight(reset)와 웹 기본 스타일
- `components`: vanilla-extract 공용 컴포넌트와 recipes의 각 variant
- `utilities`: 화면 배치용 Tailwind 유틸리티

새 `.css.ts` 스타일과 variant는 `componentLayer` 안에 정의합니다.
레이어 밖의 일반 선언은 레이어 안의 선언보다 우선하므로 사용하지 않습니다.
`!important`는 우선순위 규칙을 바꾸므로 사용하지 않습니다.

## 컴포넌트 조합

- 컴포넌트 내부 색상·간격·라운드는 `vars`를 사용합니다.
- `className`은 생성된 클래스와 병합하고 실제 DOM 요소에 전달합니다.
- 문자열에서 클래스의 앞뒤 순서가 CSS 우선순위를 결정하지 않습니다.
- 화면에서는 `w-full`, `flex`, `grid` 등으로 너비·배치를 조정합니다.
- 색상·내부 간격·상태 변경은 가능하면 recipes의 명시적인 variant로 제공합니다.
- 두 Tailwind 유틸리티 사이의 충돌을 자동 해결하는 기능은 포함하지 않습니다.
- 이벤트 핸들러를 전달하는 사용처는 Client Component 경계 안에서 사용합니다.
- `Button`과 기본 페이지는 통합 검증용 최소 예시이며 최종 디자인 시스템 API가 아닙니다.

## 환경 변수

현재 스타일 검증 페이지는 환경 변수 없이 실행됩니다. `.env.local` 복사는 설정 파일을 준비하는 단계이며, 예시의 API 변수는 주석 상태로 둬도 됩니다.

- 위치: `apps/web/.env.local` — 저장소 루트나 `src/`에 두지 않습니다.
- 목록·목적·필수 여부: [`.env.example`](./.env.example)
- BE·AI 주소는 실제 환경이 확인된 후 입력합니다. 기본 주소를 임의로 대입하지 않습니다.
- `NEXT_PUBLIC_` 값은 브라우저에 공개됩니다. 비밀키·토큰을 저장하지 않습니다.
- 공개 변수는 `next build` 시 확정됩니다. 배포 주소를 바꾸려면 다시 빌드해야 합니다.
- 개발 중 값을 바꾸면 개발 서버를 재시작합니다.
- `.env.local`과 실제 환경별 값은 Git에 커밋하지 않습니다.

API 호출·타입 생성·SSE·캐시 인계 규칙은 [API·환경 변수 계약](./docs/api-contract.md)에 정리했습니다. 현재 API Client·Provider·코드 생성·계약 CI는 미구현입니다.

## QA 연결

Storybook·테스트 환경을 구현할 때 다음 경계를 사용합니다. 현재 연결 완료를 뜻하지 않습니다.

| 항목                | 연결 계약                                                                               |
| ------------------- | --------------------------------------------------------------------------------------- |
| 컴포넌트 진입점     | `apps/web/src/components/ui/button/index.ts` (`Button`, `ButtonProps`)                  |
| 웹 내부 import      | `@/components/ui/button`                                                                |
| 웹 내부 토큰 import | `@/styles/theme`의 `vars`                                                               |
| 패키지 토큰 import  | `@folioo/bud-tokens`의 `vars`, `text`                                                   |
| 스타일 진입점       | `apps/web/src/styles/globals.css`를 Storybook preview에서 한 번 로딩                    |
| alias               | Storybook 설정의 `@`를 **웹의** `apps/web/src` 절대 경로로 연결                         |
| 선행 작업           | BUD 토큰 패키지 빌드 후 Storybook·테스트 실행                                           |
| 컴파일              | Vite 기반 Storybook에는 vanilla-extract Vite 플러그인과 Tailwind PostCSS 설정 별도 구성 |
| CSS 순서            | 웹과 동일한 `theme → base → components → utilities` 유지                                |

Storybook에서 globals.css를 가져오면 BUD CSS도 함께 로딩됩니다. 별도 reset이나 BUD 스타일 중복 import를 추가하지 않습니다. Storybook 프로젝트에서도 workspace 의존성과 패키지 해석을 설정해야 합니다.

현재 검증용 Button은 업무 로직·라우터·API Provider에 의존하지 않습니다. 이벤트 핸들러를 사용하는 Next.js 화면은 Client Component 경계에서 조합합니다. 서버 전용 환경 변수·모듈은 공용 컴포넌트나 Storybook에서 import하지 않습니다.

Storybook·Playwright·Chromatic 실행 명령은 해당 환경 구현 시 추가합니다. 현재는 빈 성공 스크립트를 제공하지 않습니다.
