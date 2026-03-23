---
estimated_steps: 5
estimated_files: 6
skills_used:
  - create-gsd-extension
  - test
  - debug-like-expert
---

# T02: Implement and register gsd_plan_slice and gsd_plan_task

**Slice:** S02 — plan_slice + plan_task tools + PLAN/task-plan renderers
**Milestone:** M001

## Description

Add the actual DB-backed planning tools for slices and tasks, reusing the S01 handler pattern instead of inventing new plumbing. This task should leave the extension with canonical `gsd_plan_slice` and `gsd_plan_task` registrations, flat validation, transactional DB writes, truthful plan rendering, and observable cache invalidation proof.

## Steps

1. Read `src/resources/extensions/gsd/tools/plan-milestone.ts` and mirror its validate → transaction → render → invalidate flow for slice/task planning.
2. Add any missing DB helpers in `src/resources/extensions/gsd/gsd-db.ts` needed to upsert slice planning fields, create/update task planning rows, and query the rendered state used by the handlers.
3. Implement `src/resources/extensions/gsd/tools/plan-slice.ts` with flat input validation, parent-slice existence checks, transactional writes of slice planning plus task rows, renderer invocation, and cache invalidation after successful render.
4. Implement `src/resources/extensions/gsd/tools/plan-task.ts` with flat input validation, parent-slice existence checks, task row upsert logic, task-plan rendering, and post-success cache invalidation.
5. Register both tools and any aliases in `src/resources/extensions/gsd/bootstrap/db-tools.ts`, then add focused handler tests in `src/resources/extensions/gsd/tests/plan-slice.test.ts` and `src/resources/extensions/gsd/tests/plan-task.test.ts` for validation, idempotence, render failure behavior, and parse-visible cache updates.

## Must-Haves

- [ ] `gsd_plan_slice` exists as a registered DB-backed tool and writes/renders slice planning state from a flat payload.
- [ ] `gsd_plan_task` exists as a registered DB-backed tool and writes/renders task planning state from a flat payload.
- [ ] Both handlers invalidate `invalidateStateCache()` and `clearParseCache()` only after successful DB write + render, with observable tests proving parse-visible state updates.

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-slice.test.ts src/resources/extensions/gsd/tests/plan-task.test.ts`
- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-slice.test.ts src/resources/extensions/gsd/tests/plan-task.test.ts src/resources/extensions/gsd/tests/markdown-renderer.test.ts --test-name-pattern="cache|idempotent|render failed|validation failed|plan-slice|plan-task"`

## Observability Impact

- Signals added/changed: new handler error payloads for validation / DB write / render failures, plus observable cache-invalidation assertions for slice/task planning writes.
- How a future agent inspects this: run the targeted plan-slice/plan-task test files and inspect `details.operation`, DB rows, and rendered artifacts captured by those tests.
- Failure state exposed: malformed input, missing parent slice, renderer failure, and stale parse-visible state become direct testable outcomes.

## Inputs

- `src/resources/extensions/gsd/tools/plan-milestone.ts` — canonical planning handler pattern from S01
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — current DB tool registration surface
- `src/resources/extensions/gsd/gsd-db.ts` — existing slice/task storage and query primitives
- `src/resources/extensions/gsd/markdown-renderer.ts` — renderer functions produced by T01
- `src/resources/extensions/gsd/tests/plan-milestone.test.ts` — reference shape for planning handler tests
- `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` — renderer proof surfaces the handlers rely on

## Expected Output

- `src/resources/extensions/gsd/tools/plan-slice.ts` — DB-backed slice planning handler
- `src/resources/extensions/gsd/tools/plan-task.ts` — DB-backed task planning handler
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — tool registration for `gsd_plan_slice` and `gsd_plan_task`
- `src/resources/extensions/gsd/gsd-db.ts` — any missing upsert/query helpers for slice/task planning state
- `src/resources/extensions/gsd/tests/plan-slice.test.ts` — slice planning handler regression coverage
- `src/resources/extensions/gsd/tests/plan-task.test.ts` — task planning handler regression coverage
