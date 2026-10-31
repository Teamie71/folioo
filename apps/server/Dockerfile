# ========================================
# Stage 1: Build
# ========================================
FROM node:20-alpine AS builder

# pnpm 설치 (버전 고정으로 빌드 재현성 보장)
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

# 의존성 파일 복사 (캐시 활용)
COPY package.json pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사 및 빌드
COPY . .
RUN pnpm run build

# 프로덕션 의존성만 남기기 (최적화)
RUN pnpm prune --prod

# ========================================
# Stage 2: Production
# ========================================
FROM node:20-alpine AS production

# curl 설치 (healthcheck용)
RUN apk add --no-cache curl

# 보안: non-root 사용자 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# 프로덕션 의존성 복사 (builder에서 prune된 node_modules)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# 빌드 결과물 복사
COPY --from=builder /app/dist ./dist

# 소유권 변경
RUN chown -R nestjs:nodejs /app

# non-root 사용자로 전환
USER nestjs

# 환경변수 설정
ENV NODE_ENV=production
ENV APP_PROFILE=prod

# 포트 노출
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 실행
CMD ["node", "dist/main.js"]
