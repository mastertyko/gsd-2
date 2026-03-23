# S01: Schema v8 + plan_milestone tool + ROADMAP renderer — UAT

**Milestone:** M001
**Written:** 2026-03-23T15:47:31.051Z

# S01: Schema v8 + plan_milestone tool + ROADMAP renderer — UAT

**Milestone:** M001
**Written:** 2026-03-23

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S01 delivers backend planning state capture, markdown rendering, and enforcement logic. The authoritative proof is the DB state, rendered artifacts, and regression tests rather than a human-facing UI.

## Preconditions

- Working directory is the repo root.
- Node can run the repository’s TypeScript tests with the resolver harness.
- No external services or secrets are required.

## Smoke Test

Run:

`node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts`

Expected: all handler tests pass, proving a milestone planning payload can be validated, written to DB, rendered to ROADMAP.md, and rerun idempotently.

## Test Cases

### 1. Milestone planning writes DB state and renders roadmap

1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts`.
2. Confirm the test `handlePlanMilestone writes milestone and slice planning state and renders roadmap` passes.
3. **Expected:** milestone planning fields and slice rows are persisted, ROADMAP.md is rendered from DB state, and the handler returns success.

### 2. Invalid milestone planning payloads are rejected structurally

1. Run the same `plan-milestone.test.ts` suite.
2. Confirm the test `handlePlanMilestone rejects invalid payloads` passes.
3. **Expected:** malformed flat tool params are rejected before any persisted state is accepted as valid planning output.

### 3. Schema v8 migration and roadmap backfill work on pre-existing data

1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/migrate-hierarchy.test.ts src/resources/extensions/gsd/tests/markdown-renderer.test.ts`.
2. Confirm the migration scenarios and renderer scenarios pass.
3. **Expected:** a v7-style hierarchy upgrades to schema v8, planning-oriented fields/tables exist, and roadmap rendering/backfill behavior remains parser-compatible.

### 4. Planning prompts route through tools instead of manual roadmap/plan writes

1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/prompt-contracts.test.ts`.
2. Confirm the milestone/slice/replan/reassess prompt contract tests pass.
3. **Expected:** prompts reference `gsd_plan_milestone` and related DB-backed planning behavior, and explicit manual ROADMAP.md / PLAN.md write instructions are absent or forbidden.

### 5. Rogue planning artifact writes are detected

1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/rogue-file-detection.test.ts`.
2. Confirm the roadmap and slice-plan rogue detection cases pass.
3. **Expected:** direct ROADMAP.md / PLAN.md files without corresponding DB planning state are flagged as rogue, while DB-backed rendered artifacts are not flagged.

## Edge Cases

### Renderer diagnostics on stale or missing planning output

1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/markdown-renderer.test.ts --test-name-pattern="stderr warning|stale"`.
2. **Expected:** the renderer emits the expected stale/missing-content diagnostics without masking failures.

### Render failure does not leak stale parse-visible roadmap state

1. Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts`.
2. Inspect the passing test `handlePlanMilestone surfaces render failures and does not clear parse-visible state on failure`.
3. **Expected:** a render failure does not falsely advance parse-visible roadmap state, and a later successful run does.

## Failure Signals

- `ERR_MODULE_NOT_FOUND` under bare `node --test` without the resolver import indicates a harness mismatch; use the resolver-based command before diagnosing product regressions.
- `plan-milestone.test.ts` failures indicate broken validation, transactional writes, rendering, or cache invalidation behavior.
- `markdown-renderer.test.ts` stale/diagnostic failures indicate roadmap rendering or artifact synchronization regressions.
- `rogue-file-detection.test.ts` failures indicate planning bypasses may no longer be surfaced.

## Requirements Proved By This UAT

- R001 — schema v8 migration and planning storage exist and pass migration coverage.
- R002 — `gsd_plan_milestone` validates, writes DB state, renders ROADMAP.md, and reruns idempotently.
- R007 — full ROADMAP.md rendering from DB and renderer diagnostics are proven.
- R013 — planning prompts route to tools instead of manual planning-file writes.
- R015 — planning handler cache invalidation is proven through observable parse-visible state changes.
- R018 — rogue planning artifact writes are detected against DB state.

## Not Proven By This UAT

- R003/R004 — slice/task planning tools are not part of S01.
- R005/R006 — replan/reassess structural enforcement lands in S03.
- R009/R010/R012/R016/R017/R019 — hot-path migration, broader caller migration, parser retirement, sequence-aware ordering, pre-M002 recovery migration, and task-plan runtime contract work remain for later slices.

## Notes for Tester

- Use the resolver-based TypeScript harness for authoritative results in this repo.
- If a bare `node --test` command fails while the resolver-based command passes, treat that as known harness behavior unless a resolver-based run also fails.
- The proof here is intentionally regression-test heavy because S01 changes storage, rendering, prompts, and enforcement rather than a visible UI flow.
