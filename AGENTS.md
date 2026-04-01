# Repository Guidelines

## Project Structure & Module Organization
This repository hosts three apps under `apps/`. `apps/admin` is a Vite + React + TypeScript dashboard, with source in `src/`, static files in `public/`, and colocated tests such as `src/components/layout/app-sidebar.test.tsx`. `apps/weapp` contains the WeChat Mini Program in `miniprogram/`. `apps/api` is a standalone Go service with entrypoints in `cmd/`, business code in `internal/`, shared packages in `pkg/`, and runtime data in `data/` and `tmp/`.

`pnpm-workspace.yaml` currently includes `apps/admin` and `apps/weapp`; treat `apps/api` as an independent Go module.

## Build, Test, and Development Commands
- `pnpm dev:admin`: start the admin app with Vite.
- `pnpm build:admin`: run TypeScript build and produce the admin bundle.
- `pnpm lint:admin`: run `oxlint` in `apps/admin`.
- `pnpm test:admin`: run the admin Vitest suite once.
- `pnpm dev:api`: launch the Go API through `scripts/dev-api.ps1` with hot reload via `air`.
- `cd apps/api; go test ./...`: run API unit tests.
- `pnpm dev:weapp`: open the Mini Program directory and try to launch WeChat DevTools.
- `pnpm typecheck:weapp`: run TypeScript checks for the Mini Program.

## Coding Style & Naming Conventions
In `apps/admin`, `oxfmt` defines 2-space indentation, semicolons, double quotes, and trailing commas where valid in ES5. Keep React/TypeScript files small and focused; split modules before they become large or multi-purpose. Use `kebab-case` for filenames such as `theme-toggle.tsx`, `PascalCase` for React component names, and colocate tests beside the source file.

Only add comments for non-obvious logic, and keep them in Simplified Chinese.

## Testing Guidelines
Admin tests use Vitest with Testing Library and should follow `*.test.tsx`. API tests use Go’s standard testing package and should follow `_test.go`. Add or update tests whenever behavior changes, especially in route guards, shared UI primitives, and API handlers/services.

## Commit & Pull Request Guidelines
Follow the Conventional Commit types configured in `apps/admin/.commitlintrc.js`: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, and related variants. Keep subjects short and imperative. If you use Commitizen, run `pnpm --dir apps/admin cz`.

PRs should state the affected app(s), summarize user-visible changes, list verification commands, and include screenshots for admin or Mini Program UI updates. Call out config changes in `apps/api/config/config.yaml` or `.vscode/settings.json`.

## Configuration & Security Tips
The default API config listens on port `33001` and uses SQLite files under `apps/api/data/`. Treat secrets in `config.yaml`, `.env`, and WeChat DevTools settings as local-only values; do not commit real credentials.
