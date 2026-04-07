#!/usr/bin/env bash

set -euo pipefail

: "${DEPLOY_SHA:?缺少 DEPLOY_SHA}"
: "${SERVER_REPO_DIR:?缺少 SERVER_REPO_DIR}"
: "${API_COMPOSE_FILE:?缺少 API_COMPOSE_FILE}"

resolve_app_version() {
  if [[ -n "${DRONE_TAG:-}" ]]; then
    echo "$DRONE_TAG"
    return
  fi

  if [[ -n "${DRONE_BUILD_NUMBER:-}" ]]; then
    echo "build-${DRONE_BUILD_NUMBER}-${DEPLOY_SHA:0:7}"
    return
  fi

  echo "${DEPLOY_SHA:0:7}"
}

readonly APP_VERSION="$(resolve_app_version)"

cd "$SERVER_REPO_DIR"

git fetch --all --prune
git checkout "$DEPLOY_SHA"

if [[ ! -f "$API_COMPOSE_FILE" ]]; then
  echo "未找到服务器固定 compose 文件: $API_COMPOSE_FILE" >&2
  exit 1
fi

APP_VERSION="$APP_VERSION" docker compose -f "$API_COMPOSE_FILE" up -d --build
