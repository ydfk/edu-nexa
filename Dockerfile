FROM golang:1.24-alpine AS api-builder

ARG APP_VERSION=dev
# ARG GOPROXY=https://goproxy.cn|https://goproxy.io|https://mirrors.aliyun.com/goproxy/|direct
# ARG GOSUMDB=sum.golang.google.cn

WORKDIR /workspace/apps/api

ENV APP_VERSION=$APP_VERSION
# ENV GOPROXY=$GOPROXY
# ENV GOSUMDB=$GOSUMDB

RUN apk add --no-cache git

COPY apps/api/go.mod apps/api/go.sum ./

RUN go mod download

COPY apps/api ./

RUN CGO_ENABLED=0 GOOS=linux go build \
  -trimpath \
  -ldflags="-s -w -X 'github.com/ydfk/edu-nexa/apps/api/pkg/buildinfo.version=${APP_VERSION}'" \
  -o /out/api ./cmd

FROM alpine:3.22

ARG APP_VERSION=dev

ENV APP_VERSION=$APP_VERSION
ENV TZ=Asia/Shanghai
LABEL org.opencontainers.image.version=$APP_VERSION

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=api-builder /out/api /app/main

RUN mkdir -p /app/config /app/data /app/log

EXPOSE 33001

CMD ["/app/main"]
