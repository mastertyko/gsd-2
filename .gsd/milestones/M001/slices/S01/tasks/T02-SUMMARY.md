---
id: T02
parent: S01
milestone: M001
key_files:
  - src/resources/extensions/gsd/tools/plan-milestone.ts
  - src/resources/extensions/gsd/bootstrap/db-tools.ts
  - src/resources/extensions/gsd/markdown-renderer.ts
  - src/resources/extensions/gsd/tests/plan-milestone.test.ts
key_decisions:
  - Implemented `gsd_plan_milestone` using the same validate → transaction → render → invalidate structure as the completion handlers so downstream planning tools can follow one DB-backed pattern.
  - Added a minimal `renderRoadmapFromDb()` renderer to generate ROADMAP.md directly from milestone and slice rows instead of only patching existing files.
  - Adapted verification to the repository’s actual TypeScript test harness (`resolve-ts.mjs` + `--experimental-strip-types`) because the literal `node --test` plan command does not run this source tree.
duration: ""
verification_result: mixed
completed_at: 2026-03-23T15:31:33.286Z
blocker_discovered: false
observability_surfaces:
  - src/resources/extensions/gsd/tests/plan-milestone.test.ts
  - src/resources/extensions/gsd/tools/plan-milestone.ts handler return/errors
  - src/resources/extensions/gsd/markdown-renderer.ts rendered ROADMAP artifact output
  - cache visibility through parseRoadmap()/clearParseCache() behavior in tests
---

# T02: Added the DB-backed gsd_plan_milestone handler, tool registration, roadmap rendering path, and focused tests, then stopped at the first concrete repo-local test harness failure.

**Added the DB-backed gsd_plan_milestone handler, tool registration, roadmap rendering path, and focused tests, then stopped at the first concrete repo-local test harness failure.**

## What Happened

I executed the T02 contract against local reality instead of the stale planner snapshot. First I verified the slice-plan pre-flight observability fix was already present and confirmed T01’s previously reported import/runtime issue still affected direct `node --test` runs. I then read the completion handlers, DB accessors, renderer, tool bootstrap, and the existing `plan-milestone.test.ts` file. That test file was unrelated dead coverage for `inlinePriorMilestoneSummary`, so I replaced it with focused `plan-milestone` handler coverage matching the task contract. On the implementation side I created `src/resources/extensions/gsd/tools/plan-milestone.ts` with a validate → transaction → render → invalidate flow. The handler performs flat-parameter validation, inserts/upserts milestone planning state plus slice planning state transactionally, renders roadmap output from DB via a new `renderRoadmapFromDb()` function in `src/resources/extensions/gsd/markdown-renderer.ts`, and then calls both `invalidateStateCache()` and `clearParseCache()` after a successful render. I also registered the canonical `gsd_plan_milestone` tool plus `gsd_milestone_plan` alias in `src/resources/extensions/gsd/bootstrap/db-tools.ts` with flat TypeBox parameters and the same execution style used by the completion tools. For verification, I first ran the literal task-plan command and confirmed it still fails before reaching the new code because this repo’s TypeScript tests require the `resolve-ts.mjs` loader. I then adapted to the project’s actual test harness and reran the new suite with `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts`. That reached the real handler tests: three passed, and two failed immediately because the tests attempted to monkey-patch read-only ESM exports (`invalidateStateCache` / `clearParseCache`) to count calls. Per the wrap-up instruction and debugging discipline, I stopped at that first concrete, understood failure instead of continuing into another test rewrite cycle. The next resume point is narrow: update the two cache-invalidation assertions in `src/resources/extensions/gsd/tests/plan-milestone.test.ts` to verify cache-clearing behavior without assigning to ESM exports, rerun the adapted task-level command, then run the slice-level checks relevant to T02.

## Verification

Verification reached the real T02 handler code only when I used the repo’s existing TypeScript test harness (`--import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types`). The stale literal `node --test ...` command still fails at module resolution before exercising the new code because the source tree uses `.js` specifiers resolved by that loader. Under the adapted harness, the new handler suite passed the valid write path, invalid payload rejection, and idempotent rerun checks. It failed on the two cache-related tests because they used an invalid testing approach: assigning to imported ESM bindings. That leaves the production implementation in place and the remaining work constrained to fixing those assertions, then rerunning the adapted command.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --test src/resources/extensions/gsd/tests/plan-milestone.test.ts` | 1 | ❌ fail | 104ms |
| 2 | `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts` | 1 | ❌ fail | 161ms |


## Deviations

Used the repository’s actual TypeScript test harness (`node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test ...`) instead of the task plan’s literal `node --test ...` command because the local repo cannot run these source `.ts` tests without the resolver. Replaced the pre-existing unrelated `plan-milestone.test.ts` contents with the focused handler tests required by T02. Stopped before rewriting the two failing cache tests due to the context-budget wrap-up instruction.

## Known Issues

`src/resources/extensions/gsd/tests/plan-milestone.test.ts` still contains two failing tests that try to assign to read-only ESM exports (`invalidateStateCache` and `clearParseCache`). The correct next step is to verify cache invalidation via observable behavior or another non-mutation seam, then rerun `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts`. Also note that the task-plan verification command is stale for this repo: direct `node --test` still fails at `ERR_MODULE_NOT_FOUND` on `.js` sibling specifiers unless the resolver import is used.

## Diagnostics

- Run `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts` to exercise the authoritative handler proof path.
- Inspect `src/resources/extensions/gsd/tools/plan-milestone.ts` and `src/resources/extensions/gsd/bootstrap/db-tools.ts` to confirm the validate → transaction → render → invalidate pattern and canonical/alias registration remain wired.
- If cache-related regressions are suspected, verify them through parse-visible roadmap behavior in `src/resources/extensions/gsd/tests/plan-milestone.test.ts` rather than trying to monkey-patch ESM exports.

## Files Created/Modified

- `src/resources/extensions/gsd/tools/plan-milestone.ts`
- `src/resources/extensions/gsd/bootstrap/db-tools.ts`
- `src/resources/extensions/gsd/markdown-renderer.ts`
- `src/resources/extensions/gsd/tests/plan-milestone.test.ts`
