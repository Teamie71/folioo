# Folioo monorepo

명령은 저장소 루트(`folioo`)에서 실행합니다.
에디터도 이 폴더를 워크스페이스로 열어 `.vscode/settings.json`을 적용합니다.

## 개발 도구와 설치

[mise](https://mise.jdx.dev/getting-started)로 개발 도구를 관리합니다. macOS에서는 `brew install mise`로 설치할 수 있습니다.

| 도구    | 버전    |
| ------- | ------- |
| Node.js | 24.22.1 |
| pnpm    | 10.33.0 |
| Python  | 3.12.14 |
| uv      | 0.11.7  |

정확한 설치 버전은 [mise.toml](./mise.toml)이 기준입니다. Node 지원 범위와 pnpm 버전은 루트 `package.json`에도 명시합니다.
기존 mise 설정을 읽어 확인한 뒤 신뢰하고 설치합니다.

```sh
mise trust
mise install
mise exec -- pnpm install --frozen-lockfile
```

`mise install`은 Python·uv도 설치하지만 AI의 Python 프로젝트 의존성 설치와 DB 준비는 별도입니다.
웹 개발과 공통 검사는 AI 서버·테스트 DB 없이 진행할 수 있습니다.

이 문서는 명령에 `mise exec --`를 명시합니다. zsh에서 자동 전환하려면 `~/.zshrc`에
`eval "$(mise activate zsh)"`를 한 번 추가하고 새 터미널을 엽니다. 기존 nvm 초기화가 있다면 그 아래에 둡니다.
이후 저장소에서 `node --version`, `pnpm --version`으로 위 버전을 확인합니다.
다른 버전 관리 도구로 이 프로젝트의 버전을 별도로 변경하지 않습니다.

## 실행·검사 범위

| 명령 (`mise exec --` 뒤에 실행)  | 범위·사전 조건                                                         |
| -------------------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`                       | 현재 웹 개발 서버와 선행 BUD 빌드. AI 서버 제외                        |
| `pnpm build`                     | 정의된 패키지 빌드. 현재 BUD·웹                                        |
| `pnpm check`                     | 공통 포맷·JS/TS 린트·타입 검사·빌드를 순서대로 실행. AI 전용 검사 제외 |
| `pnpm --filter @folioo/web lint` | 웹의 Next.js·React·TypeScript 린트                                     |
| `pnpm ai:setup`                  | AI 기본·개발 의존성 설치                                               |
| `pnpm ai:setup:local`            | 로컬 DB 실행 지원을 포함한 AI 의존성 설치                              |
| `pnpm ai:dev`                    | 로컬 DB 도구를 포함한 AI 서버. 환경 변수·DB 준비 필요                  |
| `pnpm ai:dev:external`           | 외부 PostgreSQL을 사용하는 AI 서버. 환경 변수·DB 준비 필요             |
| `pnpm ai:check`                  | AI 린트·포맷·테스트. 전용 테스트 DB 등 준비 필요                       |
| `pnpm check:all`                 | 공통 검사 성공 후 AI 전체 검사                                         |

```sh
mise exec -- pnpm dev
```

```sh
mise exec -- pnpm check &&
mise exec -- pnpm --filter @folioo/web lint
```

현재 루트 린트와 웹 전용 린트에는 웹 검사 중복이 있습니다. 역할 분리는 후속 설정 작업이며,
루트의 `Pages directory cannot be found` 메시지도 함께 정리합니다.
AI 패키지가 Turbo의 scope에 표시되더라도 `check-types`·`build` 스크립트가 없는 AI 패키지의 테스트가 실행되는 것은 아닙니다.
AI 검증 완료 여부는 별도 `ai:check` 결과로 판단합니다.

명령 예시는 macOS·Linux의 sh/bash/zsh 기준입니다. Windows에서는 셸과 AI 로컬 DB 지원 여부를 확인하고,
AI 환경 구성은 해당 문서를 따릅니다.

## 상세 문서

- [웹 실행·환경 설정 안내](./apps/web/README.md)
- [AI 설치·실행·검사 안내](./apps/ai/README.md)
- [BUD 디자인 토큰 사용법](./packages/bud/tokens/README.md)
