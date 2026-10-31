# DB Migration Workflow (Supabase SQL)

This project uses Supabase Postgres in dev/prod.
For schema changes (table/column rename/add/drop), use SQL migrations instead of TypeORM `synchronize`.

## Why

- Keep schema history in git.
- Apply the same changes to dev and prod.
- Review SQL changes in PR before deployment.

## One linked project at a time

Supabase CLI supports one linked project per working directory.
Use link switching when you need to push to both environments.

- Dev project ref: `agmeiukuhrgqkmqsrxad`
- Prod project ref: `shzioyeqkhwuckqorevc`

## Daily flow

```bash
# 1) Link dev (default)
pnpm db:link:dev

# 2) Create migration file
pnpm db:migration:new rename_users_status

# 3) Edit SQL in supabase/migrations/<timestamp>_rename_users_status.sql

# 4) Apply to dev
pnpm db:push

# 5) Deploy application and verify
```

## Push to prod

```bash
pnpm db:link:prod
pnpm db:push
pnpm db:link:dev
```

## CD automation

Deploy workflows run migrations before server rollout:

- Dev deploy (`.github/workflows/deploy-dev.yml`): `supabase db push --db-url "$SUPABASE_DEV_DB_URL"`
- Prod deploy (`.github/workflows/deploy.yml`): `supabase db push --db-url "$SUPABASE_PROD_DB_URL"`

Required GitHub secrets:

- `SUPABASE_DEV_DB_URL`
- `SUPABASE_PROD_DB_URL`

## Reset policy

- Early local/dev experiment: reset is acceptable.
- Production-like environments: do not reset; always create forward migrations.

## Safe rename pattern

Prefer expand-contract for live traffic:

1. Add new column and backfill.
2. Deploy app that reads/writes new column.
3. Drop old column in a later migration.
