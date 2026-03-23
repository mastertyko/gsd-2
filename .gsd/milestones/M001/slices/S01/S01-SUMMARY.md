---
id: S01
parent: M001
milestone: M001
provides:
  - Schema v8 planning storage on milestones, slices, and tasks, plus `replan_history` and `assessments` tables for later slices.
  - `gsd_plan_milestone` tool registration and handler implementation as the reference planning-tool pattern.
  - `renderRoadmapFromDb()` as the canonical roadmap regeneration path from DB state.
  - Prompt contracts and rogue-write enforcement for milestone-era planning artifacts.
  - Integrated regression coverage proving the S01 boundary works together under the repo’s actual test harness.
requires:
  []
affects:
  - S02
  - S03
  - S04
  - S05
key_files:
  - src/resources/extensions/gsd/gsd-db.ts
  - src/resources/extensions/gsd/markdown-renderer.ts
  - src/resources/extensions/gsd/tools/plan-milestone.ts
  - src/resources/extensions/gsd/bootstrap/db-tools.ts
  - src/resources/extensions/gsd/auto-post-unit.ts
  - src/resources/extensions/gsd/prompts/plan-milestone.md
  - src/resources/extensions/gsd/tests/plan-milestone.test.ts
  - src/resources/extensions/gsd/tests/markdown-renderer.test.ts
  - src/resources/extensions/gsd/tests/prompt-contracts.test.ts
  - src/resources/extensions/gsd/tests/rogue-file-detection.test.ts
  - src/resources/extensions/gsd/tests/migrate-hierarchy.test.ts
key_decisions:
  - Use a thin DB-backed planning handler pattern: validate flat params, write in one transaction, render markdown from DB, then invalidate both state and parse caches.
  - Treat planning prompts as tool-call orchestration surfaces and markdown templates as output-shaping guidance, not manual write targets.
  - Detect rogue planning artifact writes by comparing disk artifacts against durable milestone/slice planning state in DB rather than inventing a separate completion status model.
  - Verify cache invalidation through observable parse-visible state instead of monkey-patching imported ESM bindings.
  - Use the repository’s resolver-based TypeScript harness as the authoritative proof path for these source tests.
patterns_established:
  - Validate → transaction → render → invalidate is the standard planning-tool handler pattern for downstream slices.
  - Render markdown from DB state after writes; do not mutate planning markdown directly as the source of truth.
  - Tie rogue artifact detection to durable DB state instead of trusting prompt compliance.
  - Use resolver-based TypeScript test execution for this repo’s source tests, and verify cache behavior through observable state rather than ESM export mutation.
observability_surfaces:
  - `src/resources/extensions/gsd/tests/plan-milestone.test.ts` for handler validation, render failure behavior, idempotence, and cache invalidation proof.
  - `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` for full ROADMAP rendering, stale-render detection/repair, and dedicated `stderr warning|stale` diagnostics.
  - `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` for prompt regressions that reintroduce direct file-write instructions.
  - `src/resources/extensions/gsd/tests/rogue-file-detection.test.ts` and `src/resources/extensions/gsd/auto-post-unit.ts` for enforcement of rogue ROADMAP.md / PLAN.md writes.
  - SQLite milestone/slice rows and artifacts rendered by `renderRoadmapFromDb()` for direct inspection of persisted planning state.
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-23T15:47:31.051Z
blocker_discovered: false
---

# S01: Schema v8 + plan_milestone tool + ROADMAP renderer

**Delivered schema v8 milestone-planning storage, the `gsd_plan_milestone` DB-backed write path, full ROADMAP rendering from DB, and prompt/enforcement coverage that blocks direct planning-file bypasses.**

## What Happened

S01 started with a broken intermediate state from early schema work and a stale assumption in the plan’s literal verification commands. The slice finished by establishing the first complete DB-backed planning path for milestones. Schema v8 support was added in `gsd-db.ts`, including new milestone/slice/task planning columns and the downstream `replan_history` and `assessments` tables required by later slices. `markdown-renderer.ts` gained a full `renderRoadmapFromDb()` path so ROADMAP.md can now be regenerated from DB state instead of only patching checkboxes. `tools/plan-milestone.ts` implemented the canonical milestone planning write flow: flat param validation, transactional writes for milestone and slice planning state, roadmap rendering, and explicit `invalidateStateCache()` plus `clearParseCache()` after successful render. `bootstrap/db-tools.ts` registered the canonical tool and alias so prompts can target the DB-backed path. The planning prompts were then rewritten to stop instructing direct roadmap/plan writes, while `auto-post-unit.ts` was extended to flag rogue ROADMAP.md and PLAN.md writes that bypass the new DB state. Regression coverage was expanded across renderer behavior, migration/backfill behavior, prompt contracts, rogue detection, and the tool handler itself. During closeout, the invalid ESM monkey-patching in cache tests was replaced with observable integration assertions that prove the same contract truthfully by checking parse-visible roadmap state before and after handler execution. The slice now provides the milestone-planning foundation the rest of M001 depends on: schema storage, a real planning tool, a full roadmap renderer, prompt enforcement, and durable regression coverage.

## Verification

Ran the full slice-level proof under the repository’s actual TypeScript resolver harness. `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts src/resources/extensions/gsd/tests/markdown-renderer.test.ts src/resources/extensions/gsd/tests/prompt-contracts.test.ts src/resources/extensions/gsd/tests/rogue-file-detection.test.ts src/resources/extensions/gsd/tests/migrate-hierarchy.test.ts` passed, covering the integrated S01 boundary. Separately ran `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/markdown-renderer.test.ts --test-name-pattern="stderr warning|stale"`, which passed and confirmed the renderer’s observability/failure-path diagnostics. Confirmed the documented observability surfaces now exist in all four task summaries by adding missing `observability_surfaces` frontmatter and `## Diagnostics` sections. Updated requirements based on evidence: R001, R002, R007, R013, R015, and R018 are now validated.

## Requirements Advanced

- R001 — Added schema v8 planning columns/tables and migration logic that later slices will populate further.
- R002 — Implemented and registered the `gsd_plan_milestone` tool with flat validation, transactional writes, rendering, and cache invalidation.
- R007 — Added full ROADMAP generation from DB state through `renderRoadmapFromDb()`.
- R013 — Rewrote milestone and adjacent planning prompts to use DB-backed tools instead of manual file writes.
- R015 — Established and tested dual cache invalidation as part of the planning handler pattern.
- R018 — Extended rogue planning artifact detection to direct ROADMAP.md and PLAN.md writes.

## Requirements Validated

- R001 — `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts src/resources/extensions/gsd/tests/markdown-renderer.test.ts src/resources/extensions/gsd/tests/prompt-contracts.test.ts src/resources/extensions/gsd/tests/rogue-file-detection.test.ts src/resources/extensions/gsd/tests/migrate-hierarchy.test.ts` passed, covering schema v8 migration/backfill and new planning storage.
- R002 — `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts` passed, proving flat input validation, transactional writes, roadmap render, and idempotent reruns.
- R007 — `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/markdown-renderer.test.ts --test-name-pattern="stderr warning|stale"` passed, alongside the full renderer suite, proving roadmap generation and diagnostics from DB state.
- R013 — `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/prompt-contracts.test.ts src/resources/extensions/gsd/tests/rogue-file-detection.test.ts` passed, proving planning prompts now direct tool usage instead of manual writes.
- R015 — `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/plan-milestone.test.ts` passed with observable assertions proving parse-visible roadmap state is only updated after successful render and cache clearing.
- R018 — `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/rogue-file-detection.test.ts` passed, proving direct ROADMAP.md and PLAN.md writes are flagged when DB planning state is absent.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Task execution initially encountered repo-local TypeScript test harness mismatches and an intermediate broken import state in `gsd-db.ts`; the slice closed by adapting verification to the repository’s resolver-based harness and replacing brittle cache tests with observable integration assertions. No remaining scope deviation in the finished slice.

## Known Limitations

S01 does not yet provide DB-backed slice/task planning tools, replan/reassess enforcement, caller migration away from markdown parsers, or flag-file migration. Bare `node --test` remains unreliable for some source `.ts` tests in this repo; the resolver-based harness is still required for truthful verification.

## Follow-ups

S02 should build `gsd_plan_slice` and `gsd_plan_task` on top of the validate → transaction → render → invalidate pattern established here. S03 should reuse the new roadmap renderer and schema tables for reassessment/replan history writes. S04 still needs the DB↔rendered cross-validation layer and hot-path caller migration that retire markdown parsing from the dispatch loop.

## Files Created/Modified

- `src/resources/extensions/gsd/gsd-db.ts` — Added schema v8 migration support, planning storage columns/tables, and milestone/slice planning query and upsert helpers.
- `src/resources/extensions/gsd/markdown-renderer.ts` — Added full ROADMAP rendering from DB state and kept renderer diagnostics/stale detection exercised by tests.
- `src/resources/extensions/gsd/tools/plan-milestone.ts` — Implemented the DB-backed milestone planning tool handler with validation, transactional writes, rendering, and cache invalidation.
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — Registered `gsd_plan_milestone` plus alias metadata in the DB tool bootstrap.
- `src/resources/extensions/gsd/md-importer.ts` — Extended hierarchy migration/import coverage to backfill new planning fields best-effort from existing roadmap content.
- `src/resources/extensions/gsd/auto-post-unit.ts` — Extended rogue write detection to catch direct ROADMAP.md and PLAN.md planning bypasses.
- `src/resources/extensions/gsd/prompts/plan-milestone.md` — Rewrote milestone and adjacent planning prompts to use tool calls instead of manual roadmap/plan writes.
- `src/resources/extensions/gsd/prompts/guided-plan-milestone.md` — Rewrote guided milestone planning prompt to direct `gsd_plan_milestone` usage and forbid manual roadmap writes.
- `src/resources/extensions/gsd/prompts/plan-slice.md` — Shifted slice planning prompt framing toward DB-backed planning state instead of direct plan files as source of truth.
- `src/resources/extensions/gsd/prompts/replan-slice.md` — Updated replan prompt to preserve the DB-backed planning path and completed-task structural expectations.
- `src/resources/extensions/gsd/prompts/reassess-roadmap.md` — Updated reassess prompt to forbid roadmap-only edits when planning tools exist.
- `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` — Added roadmap renderer coverage for DB-backed milestone planning, artifact persistence, and stale-render diagnostics.
- `src/resources/extensions/gsd/tests/plan-milestone.test.ts` — Replaced unrelated coverage with focused milestone-planning handler tests, including observable cache invalidation behavior.
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — Added prompt contract assertions proving planning prompts reference tools and prohibit manual artifact writes.
- `src/resources/extensions/gsd/tests/rogue-file-detection.test.ts` — Added rogue roadmap/plan detection regression cases tied to DB planning-state presence.
- `src/resources/extensions/gsd/tests/migrate-hierarchy.test.ts` — Extended migration tests to cover v8 planning backfill behavior and schema upgrade paths.
- `.gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md` — Filled missing observability metadata and diagnostics sections in all task summaries for downstream debugging.
- `.gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md` — Filled missing observability metadata and diagnostics sections in all task summaries for downstream debugging.
- `.gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md` — Filled missing observability metadata and diagnostics sections in all task summaries for downstream debugging.
- `.gsd/milestones/M001/slices/S01/tasks/T04-SUMMARY.md` — Filled missing observability metadata and diagnostics sections in all task summaries for downstream debugging.
- `.gsd/PROJECT.md` — Updated project state to reflect that milestone planning is now DB-backed after S01.
- `.gsd/KNOWLEDGE.md` — Recorded durable repo-specific lessons about the resolver harness and ESM-safe cache testing.
