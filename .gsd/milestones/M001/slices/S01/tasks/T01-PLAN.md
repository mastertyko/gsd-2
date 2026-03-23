---
estimated_steps: 5
estimated_files: 5
skills_used:
  - create-gsd-extension
  - debug-like-expert
  - test
  - best-practices
---

# T01: Add schema v8 planning storage and roadmap rendering

**Slice:** S01 — Schema v8 + plan_milestone tool + ROADMAP renderer
**Milestone:** M001

## Description

Add the schema and renderer foundation S01 depends on. Extend `gsd-db.ts` from schema v7 to v8 with milestone/slice/task planning columns plus the new planning tables, add the read/write helpers the milestone-planning handler will call, implement a full ROADMAP renderer that writes parser-compatible markdown from DB state, and make sure legacy markdown import can backfill milestone planning data well enough for the transition window.

## Steps

1. Add the v7→v8 migration in `src/resources/extensions/gsd/gsd-db.ts`, including milestone, slice, and task planning columns plus `replan_history` and `assessments` tables.
2. Add or extend the typed milestone-planning query/upsert helpers in `src/resources/extensions/gsd/gsd-db.ts` so later handlers can write and read roadmap planning data without parsing markdown.
3. Implement `renderRoadmapFromDb()` in `src/resources/extensions/gsd/markdown-renderer.ts` to generate the full roadmap file, persist the artifact content, and keep the output compatible with `parseRoadmap()` callers.
4. Update `src/resources/extensions/gsd/md-importer.ts` so roadmap migration can best-effort populate the new milestone planning fields from existing markdown.
5. Extend renderer and migration tests to prove schema upgrade, roadmap round-trip fidelity, and importer backfill behavior.

## Must-Haves

- [ ] Existing DBs upgrade cleanly from schema v7 to v8 without losing existing milestone, slice, task, or artifact data.
- [ ] `renderRoadmapFromDb()` generates a complete roadmap with the sections S01 owns, not just checkbox patches.
- [ ] Rendered roadmap output still parses through the existing parser contract used during the transition window.
- [ ] Import/migration logic backfills the new milestone planning columns best-effort from legacy roadmap markdown.

## Verification

- `node --test src/resources/extensions/gsd/tests/markdown-renderer.test.ts src/resources/extensions/gsd/tests/migrate-hierarchy.test.ts`
- Confirm the new tests cover v7→v8 migration and full ROADMAP generation from DB state.

## Observability Impact

- Signals added/changed: schema version bump, milestone planning rows/columns, and artifact writes for generated roadmap content.
- How a future agent inspects this: run `node --test src/resources/extensions/gsd/tests/markdown-renderer.test.ts` and inspect the roadmap artifact rows in `src/resources/extensions/gsd/gsd-db.ts` helpers.
- Failure state exposed: migration failure, missing rendered sections, parser round-trip drift, or importer backfill gaps become explicit test failures.

## Inputs

- `src/resources/extensions/gsd/gsd-db.ts` — existing schema v7 migrations and accessor patterns to extend
- `src/resources/extensions/gsd/markdown-renderer.ts` — current checkbox-only roadmap renderer to replace with full generation
- `src/resources/extensions/gsd/md-importer.ts` — legacy markdown migration path that must tolerate v8
- `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` — current renderer test harness and round-trip expectations
- `src/resources/extensions/gsd/tests/migrate-hierarchy.test.ts` — migration coverage to extend for v8 backfill

## Expected Output

- `src/resources/extensions/gsd/gsd-db.ts` — schema v8 migration plus milestone planning accessors
- `src/resources/extensions/gsd/markdown-renderer.ts` — full `renderRoadmapFromDb()` implementation and artifact persistence updates
- `src/resources/extensions/gsd/md-importer.ts` — v8-aware roadmap import/backfill behavior
- `src/resources/extensions/gsd/tests/markdown-renderer.test.ts` — regression tests for full roadmap generation and round-trip fidelity
- `src/resources/extensions/gsd/tests/migrate-hierarchy.test.ts` — migration tests covering v7→v8 upgrade and best-effort planning-field import
