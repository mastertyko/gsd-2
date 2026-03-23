---
estimated_steps: 5
estimated_files: 5
skills_used:
  - create-gsd-extension
  - debug-like-expert
  - test
  - best-practices
---

# T02: Wire gsd_plan_milestone through the DB-backed tool path

**Slice:** S01 — Schema v8 + plan_milestone tool + ROADMAP renderer
**Milestone:** M001

## Description

Implement the actual milestone-planning tool path using the established DB-backed handler pattern from the completion tools. The result should be a flat-parameter tool that validates input, writes milestone and slice planning state transactionally, renders the roadmap from DB, stores the artifact, and clears parser/state caches so transition-window callers do not see stale content.

## Steps

1. Create `src/resources/extensions/gsd/tools/plan-milestone.ts` using the same validate → transaction → render → invalidate structure already used by the completion handlers.
2. Add milestone and slice planning upsert calls inside the transaction using the T01 schema/accessor work.
3. Render the roadmap outside the transaction via `renderRoadmapFromDb()` and treat render failure as a surfaced handler error.
4. Ensure successful execution invalidates both state and parse caches after render to satisfy R015.
5. Register `gsd_plan_milestone` and its alias in `src/resources/extensions/gsd/bootstrap/db-tools.ts`, then add focused handler tests.

## Must-Haves

- [ ] Tool parameters stay flat and structurally validate the milestone planning payload S01 owns.
- [ ] Successful calls write milestone and slice planning state in one transaction and render the roadmap from DB.
- [ ] Cache invalidation includes both `invalidateStateCache()` and `clearParseCache()` after successful render.
- [ ] Invalid input, render failure, and rerun/idempotency behavior are covered by tests.

## Verification

- `node --test src/resources/extensions/gsd/tests/plan-milestone.test.ts`
- Confirm the test suite covers valid write path, invalid payload rejection, render failure handling, and cache invalidation expectations.

## Observability Impact

- Signals added/changed: structured plan-milestone tool results and handler error surfaces for validation or render failures.
- How a future agent inspects this: run `node --test src/resources/extensions/gsd/tests/plan-milestone.test.ts` and inspect the registered tool metadata in `src/resources/extensions/gsd/bootstrap/db-tools.ts`.
- Failure state exposed: invalid payloads, DB write failures, render failures, or stale-cache regressions become explicit handler/test failures.

## Inputs

- `src/resources/extensions/gsd/gsd-db.ts` — milestone planning DB helpers added in T01
- `src/resources/extensions/gsd/markdown-renderer.ts` — roadmap render path added in T01
- `src/resources/extensions/gsd/tools/complete-task.ts` — reference handler pattern for DB-backed post-transaction rendering
- `src/resources/extensions/gsd/tools/complete-slice.ts` — reference handler pattern for parent-child status writes and roadmap rendering
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — tool registration seam for DB-backed tools

## Expected Output

- `src/resources/extensions/gsd/tools/plan-milestone.ts` — new milestone-planning handler
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — registered `gsd_plan_milestone` tool and alias
- `src/resources/extensions/gsd/tests/plan-milestone.test.ts` — focused handler/tool regression coverage
- `src/resources/extensions/gsd/gsd-db.ts` — any small support additions needed by the handler
- `src/resources/extensions/gsd/markdown-renderer.ts` — any handler-driven render support adjustments
