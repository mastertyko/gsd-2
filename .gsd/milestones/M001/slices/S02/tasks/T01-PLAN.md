---
estimated_steps: 5
estimated_files: 4
skills_used:
  - create-gsd-extension
  - test
  - debug-like-expert
---

# T01: Add DB-backed slice and task plan renderers with compatibility tests

**Slice:** S02 — plan_slice + plan_task tools + PLAN/task-plan renderers
**Milestone:** M001

## Description

Implement the missing DB→markdown renderers for slice plans and task plans before touching tool handlers. This task owns the compatibility boundary for S02: the generated `S##-PLAN.md` and `tasks/T##-PLAN.md` files must still satisfy `parsePlan()`, `parseTaskPlanFile()`, `auto-recovery.ts`, and executor skill activation via `skills_used` frontmatter.

## Steps

1. Read the existing renderer helpers in `src/resources/extensions/gsd/markdown-renderer.ts` and the parser/runtime expectations in `src/resources/extensions/gsd/files.ts` and `src/resources/extensions/gsd/auto-recovery.ts`.
2. Implement `renderPlanFromDb()` so it reads slice/task rows from `src/resources/extensions/gsd/gsd-db.ts`, emits a complete slice plan document with goal, demo, must-haves, verification, and task checklist entries, and writes/stores the artifact through the existing renderer helpers.
3. Implement `renderTaskPlanFromDb()` so it emits a task plan file with valid frontmatter fields (`estimated_steps`, `estimated_files`, `skills_used`) and the required markdown sections from the task row.
4. Add renderer tests in `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` covering parse compatibility, DB artifact persistence, and on-disk output shape for both renderers.
5. Extend `src/resources/extensions/gsd/tests/auto-recovery.test.ts` to prove a rendered slice plan plus rendered task plan files passes `verifyExpectedArtifact("plan-slice", ...)`, and that missing task-plan files still fail.

## Must-Haves

- [ ] `renderPlanFromDb()` generates parse-compatible `S##-PLAN.md` content from DB state.
- [ ] `renderTaskPlanFromDb()` generates parse-compatible `tasks/T##-PLAN.md` content with conservative `skills_used` frontmatter.
- [ ] Renderer tests cover both happy-path rendering and the runtime contract that task plan files must exist on disk for `plan-slice` verification.

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/markdown-renderer.test.ts src/resources/extensions/gsd/tests/auto-recovery.test.ts --test-name-pattern="renderPlanFromDb|renderTaskPlanFromDb|plan-slice|task plan"`
- Inspect the passing assertions in `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` and `src/resources/extensions/gsd/tests/auto-recovery.test.ts` for rendered `PLAN.md` / `T##-PLAN.md` behavior.

## Observability Impact

- Signals added/changed: stale-render diagnostics and renderer test assertions now cover slice/task plan artifacts in addition to roadmap/summary artifacts.
- How a future agent inspects this: run the targeted resolver-harness test command above and inspect generated artifacts via `getArtifact()` / disk files from the renderer tests.
- Failure state exposed: parser incompatibility, missing task-plan files, and DB/artifact drift become explicit test failures instead of silent execution-time regressions.

## Inputs

- `src/resources/extensions/gsd/markdown-renderer.ts` — existing render helper patterns and artifact persistence hooks
- `src/resources/extensions/gsd/gsd-db.ts` — slice/task query fields available to renderers
- `src/resources/extensions/gsd/files.ts` — parser expectations for `PLAN.md` and task-plan frontmatter
- `src/resources/extensions/gsd/auto-recovery.ts` — runtime artifact checks that the rendered files must satisfy
- `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` — current renderer test patterns to extend
- `src/resources/extensions/gsd/tests/auto-recovery.test.ts` — existing `plan-slice` artifact enforcement tests

## Expected Output

- `src/resources/extensions/gsd/markdown-renderer.ts` — new `renderPlanFromDb()` and `renderTaskPlanFromDb()` implementations
- `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` — coverage for slice/task plan rendering and parse compatibility
- `src/resources/extensions/gsd/tests/auto-recovery.test.ts` — coverage proving rendered task-plan files satisfy `plan-slice` runtime checks
- `src/resources/extensions/gsd/files.ts` — only if a parser-facing compatibility adjustment is required by the new truthful renderer output
