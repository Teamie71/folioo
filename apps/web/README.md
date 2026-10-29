# Web 개발 환경

## 실행

명령은 저장소 루트에서 실행합니다. Node·pnpm 설치와 버전은 [루트 개발 도구 안내](../../README.md)를 따릅니다.

```sh
mise exec -- pnpm install --frozen-lockfile

if [ ! -e apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
fi

mise exec -- pnpm run web:dev
```

환경 파일이 이미 있으면 유지하고 필요한 항목만 직접 추가합니다. 현재 기본 페이지는 API 환경 변수 없이 실행됩니다.
위 셸 예시는 sh/bash/zsh 기준입니다.

루트 `web:dev`는 웹으로 실행 범위를 제한하고 Turbo의 의존 그래프를 통해 토큰 빌드를 선행합니다.
`pnpm --filter @folioo/web dev`로 앱 스크립트를 직접 실행할 때는 토큰을 먼저 빌드해야 합니다.
BUD 원본을 수정한 경우에도 토큰을 다시 빌드합니다.

```sh
mise exec -- pnpm exec turbo run build --filter=@folioo/bud-tokens
mise exec -- pnpm --filter @folioo/web dev
```

검사는 순서대로 실행합니다.

```sh
mise exec -- pnpm run web:check
```

`web:check`는 `web:lint` → `web:check-types` → `web:build`를 순차 실행합니다.
타입 생성과 빌드가 같은 `.next` 경로를 갱신하므로 두 태스크를 한 번에 나열해 병렬 실행하지 않습니다.
웹 검사에는 공통 포맷·린트와 AI 검사가 포함되지 않습니다. 기존 공통·프론트·토큰 검사는 `pnpm run check`, AI까지 포함하려면 `pnpm run check:all`을 사용합니다.
빌드가 성공한 뒤 프로덕션 서버를 실행합니다. 개발 서버와 같은 포트를 사용하는 경우 먼저 개발 서버를 종료합니다.

```sh
mise exec -- pnpm run web:start
```

브랜치 전환·페이지 삭제 후 `.next/dev/types`가 사라진 페이지를 참조한다면 개발 서버를 종료하고
아래 자동 생성 파일만 정리한 뒤 검사를 다시 실행합니다. 평소 매번 삭제할 필요는 없습니다.

```sh
rm -rf apps/web/.next
rm -f apps/web/tsconfig.tsbuildinfo
```

## 현재 빌드 설정

- 웹의 `.css.ts`는 `@vanilla-extract/next-plugin`과 Webpack으로 컴파일합니다.
- `dev`와 `build` 모두 `--webpack`을 사용합니다. Turborepo와는 별개의 설정입니다.
- 웹은 workspace 의존성인 `@folioo/bud-tokens`를 사용합니다.

## 자동 생성 타입 파일

`next-env.d.ts`는 Next.js가 `next dev`, `next build`, `next typegen` 실행 시 생성합니다.
Git 추적·포맷·린트 대상에서 제외하며 직접 수정하지 않습니다.
`tsconfig.json`의 `include`에는 유지해야 Next.js 타입을 사용할 수 있습니다.

웹의 `check-types` 명령은 `next typegen && tsc --noEmit` 순서로 실행하므로 새 환경에서도 타입 파일을 먼저 생성합니다.
생성 여부를 검증할 때는 Turbo 캐시가 검사를 생략하지 않도록 `mise exec -- pnpm --filter @folioo/web check-types`를 직접 실행합니다.

## 폰트 로딩

Pretendard v1.3.9의 공식 가변 WOFF2 원본을 웹에서 직접 제공합니다.

- 파일: `public/fonts/pretendard/PretendardVariable.woff2` (2,057,688 bytes, 약 1.96 MiB)
- 출처: [Pretendard v1.3.9 원본](https://github.com/orioncactus/pretendard/blob/v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2)
- 라이선스: SIL Open Font License 1.1. 원본 고지·전문은 [LICENSE.txt](./public/fonts/pretendard/LICENSE.txt)에 포함합니다.
- SHA-256: `9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4`
- 지원 굵기: 공식 가변 폰트 선언 기준 45–920, normal 스타일. 현재 BUD의 400·500·600·700을 포함합니다.

루트 layout이 가져오는 `src/styles/globals.css`의 `@font-face`에서 로딩합니다.
웹은 원본 폰트의 CSS family를 `Pretendard`로 등록해 기존 BUD 기본 폰트 토큰과 연결합니다.
BUD 토큰의 이름·값과 생성 소스는 변경하지 않으며, 웹의 폰트 파일 제공 책임과 디자인 토큰을 분리합니다.

`font-display: swap`으로 로딩 전에는 fallback을 표시하고 완료 후 전환합니다.
폰트 파일은 `/fonts/pretendard/PretendardVariable.woff2`에서 요청되며 런타임 CDN 요청이나 로컬 설치 폰트 우선 사용은 설정하지 않습니다.
전체 가변 파일 하나를 사용하므로 동적 서브셋·분할 로딩 최적화는 포함하지 않습니다.

## 환경 변수

현재 스타일 검증 페이지는 환경 변수 없이 실행됩니다. `.env.local` 복사는 설정 파일을 준비하는 단계이며, 예시의 API 변수는 주석 상태로 둬도 됩니다.

- 위치: `apps/web/.env.local` — 저장소 루트나 `src/`에 두지 않습니다.
- 목록·목적·필수 여부: [`.env.example`](./.env.example)
- BE·AI 주소는 실제 환경이 확인된 후 입력합니다. 기본 주소를 임의로 대입하지 않습니다.
- `NEXT_PUBLIC_` 값은 브라우저에 공개됩니다. 비밀키·토큰을 저장하지 않습니다.
- 공개 변수는 `next build` 시 확정됩니다. 배포 주소를 바꾸려면 다시 빌드해야 합니다.
- 개발 중 값을 바꾸면 개발 서버를 재시작합니다.
- `.env.local`과 실제 환경별 값은 Git에 커밋하지 않습니다.

API 주소·인증·요청 계약은 BE·AI 설계가 확정된 후 별도 문서화합니다. 현재 웹의 API Client·Provider·코드 생성·계약 CI는 미구현입니다.

## 후속 작업

컴포넌트 API·SVG 사용 방식·CSS 우선순위는 정의가 확정된 후 별도 문서화합니다.
Storybook·Playwright·Chromatic은 아직 구축하지 않았으며, 현재 테스트 실행 명령은 제공하지 않습니다.
