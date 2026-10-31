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

### 사전 요구사항

- Node.js 20+
- pnpm (`corepack enable && corepack prepare pnpm@10.28.0 --activate`)
- Docker & Docker Compose

### 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. PostgreSQL 실행 (Docker)
docker compose up -d

# 3. 환경변수 설정
cp .env.example .env  # 필요 시 값 수정

# 4. 개발 서버 실행
pnpm run start:dev
```

### 전체 Docker 실행 (PostgreSQL + NestJS)

```bash
docker compose --profile full up -d
```

## 주요 명령어

```bash
pnpm run start:dev    # 개발 서버 (watch mode)
pnpm run build        # 빌드
pnpm run lint         # 린트
pnpm run test         # 테스트
pnpm run test:cov     # 테스트 커버리지
```

## 배포

GitHub Actions를 통해 GCP Compute Engine에 Blue-Green 방식으로 자동 배포됩니다.

| 브랜치 | 환경     | 워크플로우                         |
| ------ | -------- | ---------------------------------- |
| `dev`  | 개발     | `.github/workflows/deploy-dev.yml` |
| `main` | 프로덕션 | `.github/workflows/deploy.yml`     |

인프라 변경 시 `.github/workflows/terraform.yml`이 자동 실행됩니다.

## 문서

| 문서               | 경로                                    |
| ------------------ | --------------------------------------- |
| 아키텍처           | `docs/architecture/ARCHITECTURE.md`     |
| 도메인 전략        | `docs/architecture/DOMAIN_STRATEGY.md`  |
| ERD/DB 설계        | `docs/architecture/ERD.md`              |
| 코드 스타일        | `docs/development/CODE_STYLE.md`        |
| 예외 처리          | `docs/development/ERROR_HANDLING.md`    |
| Git 컨벤션         | `docs/development/GIT_CONVENTIONS.md`   |
| API 현황           | `docs/API.md`                           |
| 환경변수 관리      | `docs/infrastructure/ENV_MANAGEMENT.md` |
| 인프라 (Terraform) | `infra/README.md`                       |
| Terraform 인수인계 | `infra/docs/TERRAFORM_HANDOVER.md`      |
| GCP 마이그레이션   | `infra/docs/GCP_MIGRATION_GUIDE.md`     |

전체 문서 목록은 `CLAUDE.md`의 문서 경로 테이블을 참고하세요.
