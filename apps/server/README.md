# Folioo Server

포트폴리오 관리 및 첨삭 플랫폼 백엔드 서버

## 기술 스택

| 구분            | 기술                                                   |
| --------------- | ------------------------------------------------------ |
| Runtime         | Node.js 20+                                            |
| Framework       | NestJS 11.x                                            |
| Language        | TypeScript (Strict Mode)                               |
| ORM             | TypeORM                                                |
| Database        | PostgreSQL (로컬: Docker pgvector, dev/prod: Supabase) |
| Package Manager | pnpm                                                   |
| CI/CD           | GitHub Actions                                         |
| Infra           | GCP (GCE, Artifact Registry, Cloud NAT, WIF)           |
| Tunnel/DNS      | Cloudflare Tunnel + Zero Trust                         |
| Monitoring      | Sentry                                                 |

## 도메인 구조

| 도메인               | 분류       | 설명                                          |
| -------------------- | ---------- | --------------------------------------------- |
| Block                | Core       | 경험맵 구조·AI 티켓·사용량 관리               |
| Assessment           | Core       | 직무 찾기                                     |
| Portfolio            | Core       | 기존 포트폴리오 원문·외부 포트폴리오 관리     |
| Portfolio-Correction | Core       | 포트폴리오 첨삭·기업 분석·PDF 추출            |
| Kakao-Channel        | Supporting | 카카오 스킬·활동 선택·경험 대화               |
| Feedback             | Supporting | 활성 폼 조회·피드백 저장 (보상 없음)          |
| User                 | Generic    | 사용자·가입 약관·탈퇴 이력 관리               |
| Auth                 | Generic    | Kakao/Google/Naver OAuth·JWT 인증             |
| Internal             | Supporting | 현재 AI 기능의 내부 API·콜백                  |
| Experience           | Legacy     | 기존 Portfolio/경험맵 FK·조회용 엔티티만 유지 |
| Event                | Legacy     | 피드백 폼 활성 기간·참여 FK 연결만 유지       |

## 로컬 개발 환경 설정

서버는 모노레포 `apps/server`에 있으며 pnpm workspace 밖에서 자체 lockfile(`apps/server/pnpm-lock.yaml`)로 의존성을 관리합니다.
아래 명령은 모노레포 루트에서 실행합니다. 서버의 스크립트를 직접 실행하려면 `pnpm -C apps/server run <script>`를 사용합니다.

### 사전 요구사항

- mise (`mise install`로 루트 `mise.toml`의 Node 24.22.1과 pnpm 10.33.0 설치. 운영 이미지는 Node 20)
- Docker & Docker Compose

### 실행

```bash
# 1. 서버 의존성 설치 (루트 pnpm install에는 포함되지 않음)
pnpm api:setup

# 2. PostgreSQL 실행 (Docker)
docker compose -f apps/server/docker-compose.yml up -d

# 3. 환경변수 설정
cp apps/server/.env.example apps/server/.env  # 필요 시 값 수정

# 4. 개발 서버 실행
pnpm api:dev
```

### 전체 Docker 실행 (PostgreSQL + NestJS)

```bash
docker compose -f apps/server/docker-compose.yml --profile full up -d
```

## 주요 명령어

```bash
pnpm api:dev                        # 개발 서버 (watch mode)
pnpm api:build                      # 빌드
pnpm api:lint                       # 린트
pnpm api:format                     # 포맷
pnpm api:test                       # 단위 테스트
pnpm api:test:e2e                   # e2e 테스트 (DB 필요)
pnpm api:check                      # 린트 → 포맷 검사 → 빌드 → 단위 테스트
pnpm -C apps/server run test:cov    # 그 외 스크립트는 -C로 실행
```

## 배포

배포 워크플로는 아직 기존 저장소 [Teamie71/folioo-server](https://github.com/Teamie71/folioo-server)에 있습니다.
dev 배포를 모노레포로 옮기는 작업이 진행 중이며, 전환 뒤 이 절을 갱신합니다.

| 브랜치 | 환경     | 워크플로우 (folioo-server 기준)    |
| ------ | -------- | ---------------------------------- |
| `dev`  | 개발     | `.github/workflows/deploy-dev.yml` |
| `main` | 프로덕션 | `.github/workflows/deploy.yml`     |

인프라(Terraform)는 기존 저장소의 `infra/`에서 계속 관리하며, 변경 시 `.github/workflows/terraform.yml`이 실행됩니다.

## 문서

| 문서               | 경로                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 아키텍처           | `docs/architecture/ARCHITECTURE.md`                                                                                                       |
| 도메인 전략        | `docs/architecture/DOMAIN_STRATEGY.md`                                                                                                    |
| ERD/DB 설계        | `docs/architecture/ERD.md`                                                                                                                |
| 코드 스타일        | `docs/development/CODE_STYLE.md`                                                                                                          |
| 예외 처리          | `docs/development/ERROR_HANDLING.md`                                                                                                      |
| Git 컨벤션         | `docs/development/GIT_CONVENTIONS.md`                                                                                                     |
| API 현황           | `docs/API.md`                                                                                                                             |
| 환경변수 관리      | `docs/infrastructure/ENV_MANAGEMENT.md`                                                                                                   |
| 인프라 (Terraform) | [folioo-server `infra/README.md`](https://github.com/Teamie71/folioo-server/blob/dev/infra/README.md)                                     |
| Terraform 인수인계 | [folioo-server `infra/docs/TERRAFORM_HANDOVER.md`](https://github.com/Teamie71/folioo-server/blob/dev/infra/docs/TERRAFORM_HANDOVER.md)   |
| GCP 마이그레이션   | [folioo-server `infra/docs/GCP_MIGRATION_GUIDE.md`](https://github.com/Teamie71/folioo-server/blob/dev/infra/docs/GCP_MIGRATION_GUIDE.md) |

전체 문서 목록은 `AGENTS.md`의 문서 경로 테이블을 참고하세요.
