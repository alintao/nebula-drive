# NebulaDrive 星云网盘 - 服务端 + Web 前端一体化镜像
# 构建：docker build -t nebula-drive .
# 运行：docker run -d -p 8080:8080 -v nebula-data:/data -v nebula-storage:/storage nebula-drive

# ===== 阶段 1：构建服务端与 Web 前端 =====
FROM node:24-bookworm AS build
WORKDIR /app

# 先复制清单文件以利用层缓存
COPY .npmrc pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/sync/package.json apps/sync/

# 安装全部依赖（含构建工具）
RUN corepack enable && corepack prepare pnpm@9 --activate \
    && pnpm install --no-git-reset --frozen-lockfile=false

# 复制源码并构建
COPY . .
RUN pnpm --filter @nebula/server build \
    && pnpm --filter @nebula/web build \
    && pnpm --filter @nebula/sync build

# ===== 阶段 2：运行 =====
FROM node:24-bookworm
WORKDIR /app

# 服务端环境变量（默认值见 apps/server/src/config.ts）
ENV PORT=8080 \
    HOST=0.0.0.0 \
    DATA_DIR=/data \
    STORAGE_ROOT=/storage \
    APP_NAME="NebulaDrive 星云网盘" \
    APP_URL="http://localhost:8080"

# 持久化卷：数据库/上传/回收站 与 存储根目录
VOLUME ["/data", "/storage"]

# 从构建阶段复制产物
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/apps/sync/dist apps/sync/dist

EXPOSE 8080
CMD ["node", "apps/server/dist/index.js"]
