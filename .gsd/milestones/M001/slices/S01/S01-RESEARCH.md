# S01 — Research

**Date:** 2026-03-23

## Summary

S01 owns R001, R002, R007, R013, R015, and R018. This slice is targeted research, not deep exploration. The codebase already has the exact handler pattern to copy: `tools/complete-task.ts` and `tools/complete-slice.ts` do validate → DB transaction → render → cache invalidation, and `bootstrap/db-tools.ts` already registers canonical + alias DB-backed tools. The missing pieces are schema v8 expansion in `gsd-db.ts`, a new milestone-planning write path/tool, a full ROADMAP renderer from DB state, prompt migration away from direct file writes, and rogue-write detection extended beyond summaries.

The main constraint is transition-window fidelity. Existing callers still parse rendered markdown. `markdown-renderer.ts` currently only patches existing checkbox content (`renderRoadmapCheckboxes`, `renderPlanCheckboxes`) and explicitly relies on round-tripping through `parseRoadmap()` / `parsePlan()`. That means S01 cannot get away with partial rendering or a lossy format. `renderRoadmapFromDb()` has to emit the same sections the parser-dependent callers/tests expect: title, vision, success criteria, slices with checkbox/risk/depends/demo lines, proof strategy, verification classes, milestone definition of done, boundary map, and requirement coverage.

## Recommendation

Implement S01 in four build steps: (1) schema/query expansion in `gsd-db.ts`, (2) ROADMAP rendering from DB in `markdown-renderer.ts`, (3) `gsd_plan_milestone` handler + tool registration, and (4) prompt/rogue-detection/test coverage. Follow the existing M001 tool pattern exactly rather than inventing a planning-specific abstraction. That matches decision D002 and the established extension rule from the `create-gsd-extension` skill: add capabilities using the existing extension primitives/patterns, don’t build a parallel framework.

Use a flat tool schema. That is already locked by D001 and is also the least risky shape for TypeBox validation and tool registration. Keep cache invalidation explicit in the handler after DB write + render: `invalidateStateCache()` plus `clearParseCache()` are mandatory for R015 because parser callers still sit on the hot path during the transition. Also extend rogue detection immediately in `auto-post-unit.ts`; otherwise prompt migration has no enforcement surface and direct ROADMAP writes will silently bypass the DB.

## Implementation Landscape

### Key Files

- `src/resources/extensions/gsd/gsd-db.ts` — current schema is `SCHEMA_VERSION = 7`; has v1→v7 incremental migrations, row interfaces, and accessors. Needs v8 columns/tables plus milestone-planning read/write functions. Existing ordering is still `ORDER BY id` in `getMilestoneSlices()` and `getSliceTasks()`; S01 likely adds sequence columns now even though ORDER BY migration is validated in S04.
- `src/resources/extensions/gsd/markdown-renderer.ts` — current renderer is patch-oriented, not full generation. `renderRoadmapCheckboxes()` loads existing artifact content and regex-toggles `[ ]`/`[x]`. S01 needs a new `renderRoadmapFromDb(basePath, milestoneId)` that generates the entire file, writes it, stores artifact content, and invalidates caches.
- `src/resources/extensions/gsd/tools/complete-task.ts` — best concrete reference for a DB-backed tool handler. Pattern: validate params, `transaction(...)`, render file(s) outside transaction, rollback status on render failure, then invalidate `invalidateStateCache()`, `clearPathCache()`, and `clearParseCache()`.
- `src/resources/extensions/gsd/tools/complete-slice.ts` — second reference for handler shape and roadmap rendering callout. Shows how parent rows are ensured before updates and how roadmap rendering is treated as a post-transaction filesystem step.
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — tool registration seam. Existing DB tools use TypeBox, canonical names plus alias registration, `ensureDbOpen()`, and structured `details`. Add `gsd_plan_milestone` here and keep aliases/prompt guidelines consistent with current style.
- `src/resources/extensions/gsd/md-importer.ts` — `migrateHierarchyToDb()` currently imports milestone title/status/depends_on, slice title/risk/depends/demo, and task title/status from parsed markdown. For S01 it must at minimum tolerate schema v8 and populate new milestone planning columns best-effort from existing ROADMAP content.
- `src/resources/extensions/gsd/files.ts` — parser contract surface. `parseRoadmap()` currently extracts only title, vision, successCriteria, slices, and boundaryMap. Transition-window consumers still depend on this output, so ROADMAP rendering must preserve parser-readable structure even before richer DB-only fields are fully consumed.
- `src/resources/extensions/gsd/auto-post-unit.ts` — `detectRogueFileWrites()` currently only checks task and slice summaries. Extend it for direct `ROADMAP.md`/`PLAN.md` writes so planning tools have the same safety net completion tools already have.
- `src/resources/extensions/gsd/prompts/guided-plan-milestone.md` — still instructs the model to create `{{milestoneId}}-ROADMAP.md` directly. This is the primary prompt migration target for S01. `plan-milestone.md` likely needs the same migration even though only guided prompt text was inspected directly.
- `src/resources/extensions/gsd/tests/rogue-file-detection.test.ts` — existing safety-net tests for summary files. Natural place to add roadmap/plan rogue detection coverage.
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — existing contract-test pattern for prompt migration (`execute-task`, `complete-slice`). Add assertions that milestone-planning prompts reference `gsd_plan_milestone` and stop instructing direct file writes.
- `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` — already validates renderer round-trips via `parseRoadmap()` / `parsePlan()`. Extend with full ROADMAP-from-DB tests rather than inventing a new harness.
- `src/resources/extensions/gsd/tests/derive-state-crossval.test.ts` — model for transition-window parity tests called out in the milestone context. S01 won’t retire R014, but this file shows the test shape downstream slices should follow.

### Build Order

1. **Schema first in `gsd-db.ts`.** Add v8 columns/tables and row/interface/query support before touching tools. This unblocks every downstream step and avoids hand-building temporary storage.
2. **Implement `renderRoadmapFromDb()` next.** S01 writes DB first but callers still parse markdown. Until the full ROADMAP renderer exists and round-trips, the tool handler cannot be trusted.
3. **Build `tools/plan-milestone.ts` and register `gsd_plan_milestone`.** Copy the completion-tool pattern: validate → transaction/upserts → render → artifact store/caches. This is the core deliverable for R002/R015.
4. **Then migrate prompts and rogue detection.** Once the tool exists, update `plan-milestone.md` / `guided-plan-milestone.md` to call it, and extend `detectRogueFileWrites()` + tests so direct markdown writes become visible failures instead of silent divergence.
5. **Last, importer/backfill tests.** Best-effort v8 migration/import logic is lower risk than the write path but needs coverage before the slice is declared done.

### Verification Approach

- Run targeted node tests around the touched surfaces, starting with:
  - `src/resources/extensions/gsd/tests/markdown-renderer.test.ts`
  - `src/resources/extensions/gsd/tests/rogue-file-detection.test.ts`
  - `src/resources/extensions/gsd/tests/prompt-contracts.test.ts`
  - any new `plan-milestone` handler/tool tests added for S01
- Add/extend schema migration coverage in `src/resources/extensions/gsd/tests/gsd-db.test.ts` or a dedicated `plan-milestone` test file so opening a v7 DB proves v8 migration succeeds.
- Add handler proof similar to `complete-task.test.ts` / `complete-slice.test.ts`: valid input writes DB rows, renders `M###-ROADMAP.md`, stores artifact content, and invalidates caches; invalid input is structurally rejected.
- Add renderer round-trip proof: generated ROADMAP parses via `parseRoadmap()` and preserves slice IDs, checkbox state, risk, dependencies, and boundary map sections.
- Add prompt contract proof that milestone-planning prompts reference `gsd_plan_milestone` and no longer instruct direct `ROADMAP.md` creation.

## Constraints

- `gsd-db.ts` is already large and schema changes must follow the existing incremental migration chain. Do not rewrite schema bootstrap logic; add a `v7 → v8` step.
- Transition window is parser-dependent. `markdown-renderer.ts` explicitly states rendered markdown must round-trip through `parseRoadmap()` / `parsePlan()`.
- Existing query ordering is lexicographic by `id`, not sequence. S01 can add sequence columns now, but S04 owns proving all readers order by sequence.
- Tool registration currently uses `@sinclair/typebox` patterns in `bootstrap/db-tools.ts`; keep registration consistent with existing DB tools instead of adding a new registry path.

## Common Pitfalls

- **Partial ROADMAP rendering** — `renderRoadmapCheckboxes()` only patches an existing file. Reusing that pattern for S01 will leave DB as source of truth without a full markdown view, breaking parser-era callers. Generate the whole file.
- **Cache invalidation drift** — completion handlers explicitly clear parse and state caches. Missing `clearParseCache()` after milestone planning will create stale parser results during the transition window.
- **INSERT OR IGNORE where upsert is required** — `insertMilestone()` / `insertSlice()` currently ignore later field updates. The planning handler likely needs a real update/upsert path for milestone metadata instead of relying on these helpers unchanged.
- **Prompt migration without enforcement** — if prompts change before rogue detection covers ROADMAP/PLAN writes, noncompliant model output will silently create divergent state on disk.

## Open Risks

- The current `parseRoadmap()` surface does not expose all milestone sections S01 wants to store/render. The renderer can emit richer markdown than the parser reads, but importer/backfill for legacy files may be best-effort only until later slices expand parser/import logic.
- `gsd-db.ts` already duplicates some row/accessor sections and is drifting large; S01 should avoid broad refactors while changing schema because this slice is on the critical path.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| GSD extension/tooling | `create-gsd-extension` | available |
| Investigation / root-cause discipline | `debug-like-expert` | available |
| Test generation / execution patterns | `test` | available |
