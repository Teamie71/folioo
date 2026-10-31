## Environment Management

This project manages runtime env values with GCP Secret Manager.

> 환경변수 키 목록과 JSON 예시는 [`infra/docs/env-contract.md`](../../infra/docs/env-contract.md)를 참고하세요.

### Source of Truth

- `folioo-dev-config`
- `folioo-prod-config`

### GitHub Secrets (current set)

| Secret                 | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`       | GCP 프로젝트 ID (`project-70c92536-0c79-44bb-ba0`)                            |
| `WIF_PROVIDER`         | Workload Identity Federation provider 리소스명                                |
| `WIF_SERVICE_ACCOUNT`  | GitHub Actions 서비스 계정 이메일                                             |
| `TF_STATE_BUCKET`      | Terraform state / deploy-config GCS 버킷명                                    |
| `SUPABASE_DEV_DB_URL`  | 마이그레이션 전용 dev DB URL (`supabase db push` 실행 시 사용, `:6543` 금지)  |
| `SUPABASE_PROD_DB_URL` | 마이그레이션 전용 prod DB URL (`supabase db push` 실행 시 사용, `:6543` 금지) |

> `SUPABASE_*_DB_URL` GitHub Secrets는 CI/CD에서 `supabase db push` 마이그레이션 전용입니다.
> 앱 런타임에서 사용하는 DB 연결 정보는 Secret Manager의 `folioo-dev-config` / `folioo-prod-config`에 있습니다.
> `SUPABASE_*_DB_URL`에는 transaction pooler 포트(`:6543`)를 사용하지 않습니다. migration은 direct/session `:5432` 경로를 사용하세요.

Removed legacy secrets: `ENV_DEV`, `ENV_PROD`, `LIGHTSAIL_*`, `DOCKERHUB_*`, `DOCKER_IMAGE`

### How CI/CD loads env

- `deploy-dev.yml`: reads `folioo-dev-config` and writes `/home/folioo/.env.dev` on dev GCE
- `deploy.yml`: reads `folioo-prod-config` and writes `/home/folioo/.env.prod` on prod GCE

### Local sync (safe from commit)

```bash
gcloud secrets versions access latest --project="${GCP_PROJECT_ID}" --secret="folioo-dev-config" \
  | jq -r 'to_entries[] | "\(.key | ascii_upcase)=\(.value)"' > .env.dev

gcloud secrets versions access latest --project="${GCP_PROJECT_ID}" --secret="folioo-prod-config" \
  | jq -r 'to_entries[] | "\(.key | ascii_upcase)=\(.value)"' > .env.prod
```

Output files are ignored by `.gitignore`.

### Backend handoff checklist (OAuth env changes)

When backend adds/changes OAuth values (Kakao/Google/Naver), update both Secret Manager payloads first:

- `folioo-dev-config`
- `folioo-prod-config`

Required OAuth keys:

- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_CALLBACK_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_CALLBACK_URL`
- `CLIENT_REDIRECT_URI`
- `OAUTH_REFRESH_TOKEN_ENCRYPTION_KEY` (dev/prod 필수)

After changing secrets, trigger deployment so each server rewrites `/home/folioo/.env.dev` or `/home/folioo/.env.prod` from Secret Manager latest.

### Profile policy

- `local`: Docker Postgres
- `dev`: `SUPABASE_DB_URL` (required)
- `prod`: `SUPABASE_DB_URL` (required)

### Internal API keys (AI integration)

- `AI_BASE_URL`: main backend -> AI server base URL
- `AI_SERVICE_API_KEY`: main backend -> AI server `X-API-Key`
- `MAIN_BACKEND_API_KEY`: AI server -> main backend internal API `X-API-Key` (main backend validates)
