# M001: Tool-Driven Planning State Capture

**Gathered:** 2026-03-23
**Status:** Ready for planning

## Project Description

GSD-2 is a CLI coding agent harness that manages structured planning and execution workflows. M001/PR #2141 moved completion state to SQLite via tool calls. The planning half remains markdown-first: the LLM writes ROADMAP.md and PLAN.md directly to disk, the system regex-parses them back via 57+ `parseRoadmap()` callers, 42+ `parsePlan()` callers, and a 12-variant regex cascade in `roadmap-slices.ts`. This is the same anti-pattern M001 eliminated for completions.

## Why This Milestone

The parser cascade is the most common failure mode in GSD auto-mode. LLM formatting variance triggers fallback patterns, dependency ranges silently block slices, replans can renumber completed tasks (prompt-only enforcement), and `dispatch-guard.ts` re-parses ROADMAP.md on every slice dispatch. M001 proved the pattern — tool call → DB → rendered markdown — and M002 completes it for planning.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Run auto-mode with zero parser-related stalls from LLM formatting variance
- See replan attempts that try to modify completed tasks rejected with clear errors instead of silently corrupting state
- Experience faster dispatch cycles — DB queries replace markdown parsing on every dispatch

### Entry point / environment

- Entry point: `pi` CLI with `/gsd auto`
- Environment: local dev
- Live dependencies involved: none (SQLite is local)

## Completion Class

- Contract complete means: all planning tools produce correct DB state, all callers read from DB, cross-validation tests pass, parser removal doesn't break any test
- Integration complete means: auto-mode runs a full milestone using the new tools (plan → execute → replan → reassess → complete cycle)
- Operational complete means: pre-M002 projects seamlessly migrate, gsd recover handles new columns

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A full auto-mode cycle (plan milestone → plan slice → execute tasks → complete slice → reassess → next slice) uses the new tools and DB queries with zero parseRoadmap/parsePlan calls in the dispatch hot path
- A replan attempt that references completed tasks is structurally rejected by the tool handler
- A pre-M002 project with existing ROADMAP.md and PLAN.md files auto-migrates to DB on first open

## Risks and Unknowns

- **LLM compliance with flat tool schemas** — LLMs may struggle with the multi-tool planning sequence (plan_milestone → plan_slice → plan_task for each task). Mitigated by flat schema design (locked decision #1) and TypeBox validation with clear error messages.
- **Renderer fidelity during transition window** — Between S01 (tools write DB + render) and S04 (callers read from DB), callers still parse from disk. Renderer bugs create state divergence. Mitigated by cross-validation tests (R014).
- **CONTINUE.md migration complexity** — It's a structured resume contract with hook writers, prompt construction, and cleanup semantics, not just a flag. Underestimating this scope risks breaking auto-mode resume.
- **Prompt migration quality** — Planning prompts are significantly more complex than execution prompts. Rewriting them to produce tool calls while preserving creative planning quality is the hardest UX challenge.

## Existing Codebase / Prior Art

- `src/resources/extensions/gsd/tools/complete-task.ts` — M001 tool handler pattern (validate → DB transaction → render → cache invalidate)
- `src/resources/extensions/gsd/tools/complete-slice.ts` — M001 tool handler pattern
- `src/resources/extensions/gsd/gsd-db.ts` — SQLite abstraction, schema v7, migration chain, query functions
- `src/resources/extensions/gsd/roadmap-slices.ts` — 271 lines, 12 prose variant regex patterns (primary removal target)
- `src/resources/extensions/gsd/files.ts` — 1170 lines, parseRoadmap(), parsePlan(), cachedParse(), parseContinue/formatContinue
- `src/resources/extensions/gsd/state.ts` — 1367 lines, deriveState()/deriveStateFromDb(), flag file checks
- `src/resources/extensions/gsd/dispatch-guard.ts` — 106 lines, parseRoadmapSlices() on every slice dispatch
- `src/resources/extensions/gsd/auto-dispatch.ts` — 656 lines, 18 rules, 4 with explicit disk I/O
- `src/resources/extensions/gsd/md-importer.ts` — 713 lines, migrateHierarchyToDb()
- `src/resources/extensions/gsd/markdown-renderer.ts` — 721 lines, checkbox patching (M001)
- `src/resources/extensions/gsd/auto-prompts.ts` — 1649 lines, loadFile for ROADMAP/PLAN context injection
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — 487 lines, tool registration patterns
- `src/resources/extensions/gsd/auto-post-unit.ts` — detectRogueFileWrites (extend for PLAN/ROADMAP)
- `src/resources/extensions/gsd/auto-verification.ts` — 233 lines, parsePlan for task.verify
- `src/resources/extensions/gsd/bootstrap/register-hooks.ts` — CONTINUE.md hook writers
- `src/resources/extensions/gsd/tests/derive-state-crossval.test.ts` — 527 lines, M001 cross-validation pattern

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001–R008 — Schema and tool implementations (S01–S03)
- R009–R010 — Caller migration (S04–S05)
- R011 — Flag file migration (S05)
- R012 — Parser deprecation (S06)
- R013–R019 — Cross-cutting concerns (prompts, validation, caching, migration)

## Scope

### In Scope

- Schema v7→v8 migration with new columns and tables
- 5 new planning tools: gsd_plan_milestone, gsd_plan_slice, gsd_plan_task, gsd_replan_slice, gsd_reassess_roadmap
- Full markdown renderers (ROADMAP.md, PLAN.md, T##-PLAN.md) from DB state
- Hot-path and warm/cold caller migration from parsers to DB queries
- Flag file → DB column migration (REPLAN, ASSESSMENT, CONTINUE, CONTEXT-DRAFT, REPLAN-TRIGGER)
- Prompt migration for 4 planning prompts
- Cross-validation tests for the transition window
- Pre-M002 project migration via extended migrateHierarchyToDb()
- Rogue file detection for PLAN/ROADMAP writes

### Out of Scope / Non-Goals

- CQRS/event-sourcing architecture (R023)
- Perfect round-trip recovery for tool-only fields (R024)
- StateEngine abstraction layer (R021 — deferred)
- parseSummary() migration (R020 — deferred)
- Native Rust parser bridge removal (R022 — deferred, low risk follow-up)

## Technical Constraints

- Flat tool schemas (locked decision #1) — separate calls per entity, not deeply nested
- No StateEngine abstraction (locked decision #2) — query functions added to gsd-db.ts
- CONTINUE.md and CONTEXT-DRAFT migrate in M002 (locked decision #3)
- Recovery accepts fidelity loss for tool-only fields (locked decision #4)
- T##-PLAN.md files must remain a runtime contract — DB rows don't replace file existence checks
- Sequence columns must propagate to query ORDER BY — otherwise reordering is a no-op
- cachedParse() TTL cache must be invalidated alongside state cache in all tool handlers

## Integration Points

- `auto-dispatch.ts` dispatch rules — migrate 4 rules from disk I/O to DB queries
- `dispatch-guard.ts` — migrate from parseRoadmapSlices() to getMilestoneSlices()
- `auto-prompts.ts` — context injection pipeline (loads ROADMAP/PLAN from disk → could use artifacts table)
- `deriveStateFromDb()` — flag file checks currently use existsSync, migrate to DB columns
- `bootstrap/register-hooks.ts` — CONTINUE.md hook writers must migrate to DB writes
- `guided-resume-task.md` prompt — reads CONTINUE.md, must read from DB column instead
- `md-importer.ts` — migrateHierarchyToDb() extended for v8 columns

## Open Questions

- None — all design decisions locked in issue #2228 comments
