# Web 스타일 개발 환경

## 실행

저장소 루트에서 실행합니다. Node 버전과 CI는 공통 환경 담당자가 관리합니다.

```sh
pnpm exec turbo run build --filter=@folioo/bud-tokens
pnpm --filter @folioo/web dev
```

루트 `pnpm dev`는 Turbo의 의존 그래프를 통해 토큰 빌드를 선행합니다.
웹만 직접 실행할 때는 위처럼 토큰을 먼저 빌드해야 합니다.

```sh
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

## QA 연결

Storybook도 BUD 스타일과 웹 전역 CSS를 로딩하고 동일한 alias·레이어 순서를 적용해야 합니다.
Vite용 vanilla-extract 플러그인은 QA 환경 담당자가 별도로 구성합니다.
