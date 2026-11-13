# CLAUDE.md

Twenty on Cloudflare is an Nx / Yarn 4 monorepo. Runtime packages: `twenty-front` (React 19, Jotai, Linaria, Vite), `twenty-worker` (Hono, GraphQL Yoga, D1, SQLite Durable Objects, R2, Queues), `twenty-shared`, `twenty-ui`, `twenty-emails`, and `twenty-e2e-testing` (Playwright). Website and docs are independent reference packages.

Match the surrounding code — the adjacent files in the directory you are editing beat any written rule, including for file naming, which varies by area.

## House rules

Where this repo differs from your defaults:

- Short-form `//` comments, never JSDoc blocks; comment only WHY (a constraint the code cannot express, still true for a reader who never saw your change), never WHAT.
- Types over interfaces (except when extending third-party interfaces); string literals over enums (except GraphQL enums); no `any`; descriptive generics (`TData`, not `T`).
- Named exports only. Functional components only.
- Prefer event handlers over `useEffect` for state updates.
- No abbreviations in names (`fieldMetadata`, not `fm`); constants in SCREAMING_SNAKE_CASE; component props types suffixed `Props`.
- Use existing guards and helpers before writing your own: `isDefined`, `isNonEmptyArray`, `isPlainObject`, … from `twenty-shared/utils`; `isNonEmptyString`, `isString`, `isNull`, `isObject`, … from `@sniptt/guards`. Reimplementing an existing util is the most common AI-authored defect here.
- Lingui for user-facing strings, `doNotTranslate()` from `twenty-shared/i18n` for text that must stay as written (error diagnostics, protocol tokens); Linaria (zero-runtime, styled-components pattern) for twenty-front styling.
- For Twenty product concepts, consult `packages/twenty-ui/src/icon/icon-dictionary.md` and use the canonical icon.
- Import icons from `twenty-ui/icon`, never directly from `@tabler/icons-react`; action and status concepts should use their action or status icons.
- Test behavior, not implementation: query by user-visible text/roles, `@testing-library/user-event` for interactions.

## Comment sparingly

Most code is self-explanatory and a comment on it is just noise — cognitive overhead to read and maintenance debt to keep accurate. Only comment code that is genuinely unintuitive or complex: a non-obvious why , a workaround, a subtle invariant, a deliberate deviation from the obvious approach. Do not narrate what the code does — the code already says that. When a comment truly earns its place, keep it as terse as possible. This overrides matching the surrounding file's comment density. Write lean even in a verbose file.

Two or three lines, and a hard ceiling of five. "Terse" is not relative: much of this repo predates the rule and carries paragraph-length comments, so a file you are editing is not evidence of the standard — it is usually the thing the rule exists to stop spreading. If the why will not fit in five lines, the explanation belongs in a module docstring, a README or an ADR, and the comment is one line pointing there.

The same ceiling applies to a comment's neighbours: do not restate one fact in the Dockerfile, the manifest and the code that reads it. Put it once, where a reader hits it first, and let the others be silent.

Docstrings carry the what and the design; they are not exempt from terseness, but they are the right home for anything a comment is too small to hold.

## Commands

Use Node 26. Yarn is checked in at `.yarn/releases/yarn-4.18.1.cjs`.

```bash
bash packages/twenty-utils/setup-dev-env.sh  # Local Wrangler storage and frontend assets
yarn start                                  # Worker + static frontend, localhost:3000
yarn start:front                            # Optional Vite hot reload, localhost:3001
npx nx build twenty-shared --skip-nx-cache
npx nx build twenty-front
npx jest path/to/file.test.ts --config=packages/twenty-front/jest.config.mjs
npx vitest run --root packages/twenty-ui --project unit <file>
```

Run Worker commands from `packages/twenty-worker`:

```bash
npx tsgo -p tsconfig.json --noEmit
npx vitest run --maxWorkers=2 --testTimeout=30000 --hookTimeout=60000
npx wrangler deploy --dry-run --outdir dist
node scripts/export-schemas.mjs
```

Run frontend codegen from `packages/twenty-front` with `npx graphql-codegen --config codegen.cjs` and `--config codegen-metadata.cjs`. Both use Worker-owned schema files. Core schema exports must match the schema of a fresh workspace; a workerd test checks this. Run Playwright from `packages/twenty-e2e-testing`; its temporary Worker uses port 3030 and separate storage.

## Gotchas

- Rebuild shared without the Nx cache after switching branches or editing shared. Dependent typechecks otherwise use stale declarations.
- Use direct `npx tsgo -p tsconfig.json --noEmit` from each package when verifying a change; Nx can return a cached result.
- Do not build the frontend while workerd tests or Wrangler are reading its assets. Vite replaces the build directory.
- Do not commit translation catalogs unless translation is the task.
- Worker source uses kebab-case files; schema and seed snapshots live in `twenty-worker/contract` and `src/workspace/seed`.
- D1 schema changes go through numbered SQL migrations; workspace schema changes go through the Durable Object migration list. Preserve committed migration logic.
- Secrets belong in ignored `.dev.vars` locally and Wrangler secrets remotely. Never print API tokens or operator secrets in logs.
- See `packages/twenty-worker/OPERATIONS.md` for provisioning, maintenance and recovery. Production uses the `production` Wrangler environment.
- Commit messages must not include AI attribution.
