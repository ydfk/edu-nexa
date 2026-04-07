#!/usr/bin/env bash

set -euo pipefail

: "${DEPLOY_SHA:?缺少 DEPLOY_SHA}"
: "${SERVER_REPO_DIR:?缺少 SERVER_REPO_DIR}"
: "${ADMIN_WEB_ROOT:?缺少 ADMIN_WEB_ROOT}"

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

corepack enable
pnpm install --frozen-lockfile
APP_VERSION="$APP_VERSION" pnpm build:admin

mkdir -p "$ADMIN_WEB_ROOT"
rsync -av --delete apps/admin/dist/ "$ADMIN_WEB_ROOT/"
