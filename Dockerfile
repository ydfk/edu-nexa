FROM node:22.14.0-bullseye AS admin-builder

ARG APP_VERSION=dev

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/admin/package.json apps/admin/package.json

RUN corepack enable
RUN pnpm config set registry https://registry.npmmirror.com
RUN pnpm install --frozen-lockfile

COPY apps/admin ./apps/admin

RUN APP_VERSION=$APP_VERSION pnpm build:admin

FROM golang:1.24-alpine AS api-builder

ARG GOPROXY=https://goproxy.cn,direct
ARG GOSUMDB=sum.golang.google.cn

WORKDIR /workspace/apps/api

ENV GOPROXY=$GOPROXY
ENV GOSUMDB=$GOSUMDB

RUN apk add --no-cache git

COPY apps/api/go.mod apps/api/go.sum ./

RUN go mod download

COPY apps/api ./

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd

FROM caddy:2.10-alpine

ARG APP_VERSION=dev

ENV APP_VERSION=$APP_VERSION
ENV TZ=Asia/Shanghai
LABEL org.opencontainers.image.version=$APP_VERSION

RUN apk add --no-cache tzdata

WORKDIR /app

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/start.sh /usr/local/bin/start.sh
COPY --from=admin-builder /workspace/apps/admin/dist /srv
COPY --from=api-builder /out/api /app/main

RUN chmod +x /usr/local/bin/start.sh && \
  mkdir -p /app/config /app/data /app/log /data/caddy /config/caddy

EXPOSE 80
EXPOSE 33001

CMD ["/usr/local/bin/start.sh"]
