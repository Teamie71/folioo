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

| 명령 (`mise exec --` 뒤에 실행) | 범위·사전 조건                                                                |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`                      | 현재 웹 개발 서버와 선행 BUD 빌드. AI 서버 제외                               |
| `pnpm build`                    | 정의된 패키지 빌드. 현재 BUD·웹                                               |
| `pnpm check`                    | 공통 포맷·공통 린트·웹 린트·타입 검사·빌드를 순서대로 실행. AI 전용 검사 제외 |
| `pnpm web:dev`                  | 웹 개발 서버와 선행 BUD 빌드                                                  |
| `pnpm web:lint`                 | 웹의 Next.js·React·TypeScript 린트                                            |
| `pnpm web:check-types`          | 선행 의존성 빌드 후 웹 타입 검사                                              |
| `pnpm web:build`                | 선행 의존성 빌드 후 웹 프로덕션 빌드                                          |
| `pnpm web:start`                | 빌드된 웹 프로덕션 서버 실행                                                  |
| `pnpm web:check`                | 웹 린트 → 타입 검사 → 빌드. 공통 포맷·린트와 AI 검사 제외                     |
| `pnpm ai:setup`                 | AI 기본·개발 의존성 설치                                                      |
| `pnpm ai:setup:local`           | 로컬 DB 실행 지원을 포함한 AI 의존성 설치                                     |
| `pnpm ai:dev`                   | 로컬 DB 도구를 포함한 AI 서버. 환경 변수·DB 준비 필요                         |
| `pnpm ai:dev:external`          | 외부 PostgreSQL을 사용하는 AI 서버. 환경 변수·DB 준비 필요                    |
| `pnpm ai:check`                 | AI 린트·포맷·테스트. 전용 테스트 DB 등 준비 필요                              |
| `pnpm check:all`                | 기존 공통·프론트·토큰 검사 성공 후 AI 전체 검사                               |

```sh
mise exec -- pnpm run web:dev
```

```sh
mise exec -- pnpm check
```

린트 담당 범위는 다음과 같습니다.

- 루트 `pnpm lint`: 루트 설정·스크립트와 BUD 등 공통 JS/TS 코드. `apps/web`은 제외합니다.
- 웹 `pnpm web:lint`: `apps/web`의 Next.js·React·TypeScript 코드.
- AI `pnpm ai:lint`: AI Python 코드의 Ruff 검사.

CI의 `repo` job은 공통 포맷과 루트 린트를 담당합니다. 변경 영향에 따라 실행되는 `web` job은
웹 린트 → 타입 검사 → 빌드 순서를 유지합니다. 로컬 `pnpm check`도 웹 린트를 타입 검사·빌드보다 먼저 실행합니다.
AI 패키지가 Turbo의 scope에 표시되더라도 `check-types`·`build` 스크립트가 없는 AI 패키지의 테스트가 실행되는 것은 아닙니다.
AI 검증 완료 여부는 별도 `ai:check` 결과로 판단합니다.

현재 `check`는 기존 공통·프론트·토큰 검사 범위를 유지합니다. 웹만 검사하려면 `pnpm run web:check`를 사용합니다.
`check:all`은 `check`와 `ai:check`를 순차 실행하며, `web:check`를 추가로 중복 실행하지 않습니다.
공통 검사는 Prettier·ESLint를 사용하고, AI Python 검사는 별도로 Ruff를 사용합니다.

후속으로 `check`에서 프론트 검사를 완전히 분리하고 `check:all`에서 공통 검사와 각 파트 검사를 취합할 예정입니다.
백엔드의 `api:check`는 실제 검사 명령이 구현될 때 추가하며, 현재는 빈 성공 명령을 만들지 않습니다.

명령 예시는 macOS·Linux의 sh/bash/zsh 기준입니다. Windows에서는 셸과 AI 로컬 DB 지원 여부를 확인하고,
AI 환경 구성은 해당 문서를 따릅니다.

## 브랜치·PR 운영

기본 브랜치는 `dev`이며 기능 작업 PR은 `dev`를 대상으로 엽니다. `main` 반영은 별도 배포·릴리스 흐름으로 관리합니다.
PR 본문은 템플릿의 `Closes #이슈번호`를 Draft 단계부터 작성하고, Ready for review 전 최종 변경 내용과 검증 결과를 갱신합니다.
Draft 작성이나 push만으로 이슈가 닫히지는 않습니다. 이슈 자동 종료 설정이 활성화된 상태에서 기본 브랜치 `dev`에 머지되면 종료됩니다.

CI의 `ci-ok`는 `plan`·`repo`와 실행 대상 파트의 결과를 취합합니다. 실패한 필수 job이나 예상하지 못한 skip을 성공으로 처리하지 않습니다.
병합 차단은 워크플로 파일만으로 적용되지 않으므로 GitHub Ruleset의 `Require status checks to pass`에 `ci-ok`를 필수 체크로 등록해야 합니다.
`dev`·`main`은 각각 명시적인 브랜치 대상으로 설정합니다. `main` 보호가 목적이라면 기본 브랜치를 뜻하는 `~DEFAULT_BRANCH`를 사용하지 않습니다.

## 상세 문서

- [웹 실행·환경 설정 안내](./apps/web/README.md)
- [AI 설치·실행·검사 안내](./apps/ai/README.md)
- [BUD 디자인 토큰 사용법](./packages/bud/tokens/README.md)
