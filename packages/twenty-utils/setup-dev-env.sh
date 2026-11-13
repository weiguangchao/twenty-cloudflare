#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPOSITORY_ROOT"
node .yarn/releases/yarn-4.18.1.cjs install --immutable
export NX_DAEMON=false NX_ISOLATE_PLUGINS=false
node .yarn/releases/yarn-4.18.1.cjs nx build twenty-shared --skip-nx-cache
node .yarn/releases/yarn-4.18.1.cjs nx build twenty-front
cd packages/twenty-worker
if [[ ! -f .dev.vars ]]; then
  node --input-type=module -e 'import { randomBytes } from "node:crypto"; import { writeFileSync } from "node:fs"; writeFileSync(".dev.vars", `APP_SECRET=${randomBytes(48).toString("base64url")}\n`, { mode: 0o600 });'
fi
npx wrangler d1 migrations apply CORE_DB --local
printf 'Ready. Run node .yarn/releases/yarn-4.18.1.cjs start from the repository root, then open http://localhost:3000\n'
