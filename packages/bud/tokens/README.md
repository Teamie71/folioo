# @folioo/bud-tokens

Folioo 디자인 시스템 **Bud**의 디자인 토큰 패키지예요. 피그마 변수에서 만든 토큰을 vanilla-extract 테마와 CSS 변수로 제공해요.

## 설치

```bash
pnpm add @folioo/bud-tokens
```

## 사용법

앱의 최상위(예: `app/layout.tsx`)에서 스타일시트를 한 번 불러와요. 모든 CSS 변수가 `:root`에 등록돼요.

```ts
import '@folioo/bud-tokens/style.css';
```

### vanilla-extract에서

```ts
// Button.css.ts
import { style } from '@vanilla-extract/css';
import { vars } from '@folioo/bud-tokens';

export const primary = style({
  background: vars.color.bg.primary,
  color: vars.color.text.inverse,
  borderRadius: vars.radius.full,
  padding: `${vars.spacing.sm} ${vars.spacing.xl}`,
  selectors: {
    '&:hover': { background: vars.color.bg.primaryHover },
  },
});
```

### 텍스트 스타일

피그마 텍스트 스타일과 같은 이름의 클래스가 들어 있어요.

```tsx
import { text } from '@folioo/bud-tokens';

<h1 className={text.header.h1}>경험 정리</h1>
<p className={text.body.body2.regular}>사소한 경험도 정리해두면 이력서에 바로 쓸 수 있어요.</p>
```

### Tailwind와 함께 쓸 때

Tailwind는 배치(flex, grid, gap 등)에만 쓰고, 색·글자·모서리는 Bud 토큰을 써요. 간격 값이 필요하면 CSS 변수를 그대로 쓸 수 있어요.

```tsx
<div className="flex gap-[var(--bud-spacing-md)]">…</div>
```

## 토큰 구조

| 내보내기 | 내용 | 예시 |
| --- | --- | --- |
| `vars.color` | 배경·텍스트·테두리·아이콘·그라데이션 색 | `vars.color.text.default` |
| `vars.typography` | 스타일별 크기·굵기·행간·자간 | `vars.typography.header.h1.size` |
| `vars.spacing` | 간격 (none ~ 4xl) | `vars.spacing.md` → 16px |
| `vars.radius` | 모서리 (none ~ full) | `vars.radius.full` → 100px |
| `vars.shadow` | 그림자 | `vars.shadow.modal` |
| `vars.shadowColor` | 그림자·오버레이 색 | `vars.shadowColor.overlay` |
| `text` | 텍스트 스타일 클래스 20개 | `text.caption.caption1.bold` |
| `primitive` | 원본 값. 화면에서는 직접 쓰지 않아요 | `primitive.color.gray['900']` |

## 피그마 이름과 코드 이름

| 피그마 변수 | vanilla-extract | CSS 변수 |
| --- | --- | --- |
| `bg/primary-hover` | `vars.color.bg.primaryHover` | `--bud-color-bg-primary-hover` |
| `header/h1/line-height` | `vars.typography.header.h1.lineHeight` | `--bud-typography-header-h1-line-height` |
| `spacing/spacing-md` | `vars.spacing.md` | `--bud-spacing-md` |
| `gray/gray900` (Primitive) | `primitive.color.gray['900']` | `--bud-color-gray-900` |

규칙은 세 가지예요.

1. 피그마의 `/`는 객체 단계가 되고, CSS 변수에서는 `-`가 돼요.
2. 앞 단계 이름이 반복되면 빼요. `spacing/spacing-md` → `spacing.md`, `gray/gray900` → `gray.900` (타이포그래피는 `body/body1`처럼 그대로 둬요)
3. 코드 키는 camelCase(`lineHeight`), CSS 변수는 kebab-case(`line-height`)예요.

## 토큰 업데이트 방법

1. 피그마에서 변수를 수정해요.
2. `variables2json` 플러그인으로 내보낸 파일을 `figma/variables.json`에 덮어써요.
3. 빌드하고 배포해요.

```bash
pnpm build             # figma/variables.json → 토큰 생성 → dist
pnpm version patch     # 0.0.1 → 0.0.2
pnpm publish
```

`src/tokens/` 안의 파일은 자동으로 만들어지니 직접 수정하지 마세요.
