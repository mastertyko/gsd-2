---
estimated_steps: 5
estimated_files: 4
skills_used: []
---

# T03: Register tools in db-tools.ts + update prompts + prompt contract tests

**Slice:** S03 — replan_slice + reassess_roadmap with structural enforcement
**Milestone:** M001

## Description

Wire the two new handlers into the tool system by registering them in `db-tools.ts`, update the prompt templates to name the specific tools as canonical write paths, and extend prompt contract tests to catch regressions. This is the integration closure task that makes the handlers callable by auto-mode dispatch.

## Steps

1. **Register `gsd_replan_slice` in `db-tools.ts`:**
   - Add after the `gsd_plan_task` registration block (around line 531).
   - Follow the exact pattern of `gsd_plan_slice`: `ensureDbOpen()` guard, dynamic `import("../tools/replan-slice.js")`, call `handleReplanSlice(params, process.cwd())`, check for `error` in result, return structured `content`/`details`.
   - TypeBox schema mirrors `ReplanSliceParams`: milestoneId, sliceId, blockerTaskId, blockerDescription, whatChanged as `Type.String()`, updatedTasks as `Type.Array(Type.Object({...}))`, removedTaskIds as `Type.Array(Type.String())`.
   - Name: `gsd_replan_slice`, label: `"Replan Slice"`, description mentioning structural enforcement of completed tasks.
   - promptGuidelines: mention canonical name and alias.
   - Register alias: `gsd_slice_replan` → `gsd_replan_slice`.

2. **Register `gsd_reassess_roadmap` in `db-tools.ts`:**
   - Same pattern. Dynamic `import("../tools/reassess-roadmap.js")`, call `handleReassessRoadmap(params, process.cwd())`.
   - TypeBox schema mirrors `ReassessRoadmapParams`: milestoneId, completedSliceId, verdict, assessment as `Type.String()`, sliceChanges as `Type.Object({ modified: Type.Array(...), added: Type.Array(...), removed: Type.Array(Type.String()) })`.
   - Name: `gsd_reassess_roadmap`, label: `"Reassess Roadmap"`.
   - Register alias: `gsd_roadmap_reassess` → `gsd_reassess_roadmap`.

3. **Update `replan-slice.md` prompt:**
   - Add a new step before the existing file-write instructions (before step 3). The new step should say: "If a DB-backed planning tool is available, use `gsd_replan_slice` with the following parameters: milestoneId, sliceId, blockerTaskId, blockerDescription, whatChanged, updatedTasks, removedTaskIds. This is the canonical write path — it structurally enforces preservation of completed tasks and writes replan history to the DB."
   - Reposition the existing file-write steps (writing `{{replanPath}}` and `{{planPath}}`) as the degraded fallback: "If the `gsd_replan_slice` tool is not available, fall back to writing files directly..."
   - Keep all existing hard constraints about completed tasks intact — they remain as documentation even though the tool enforces them structurally.

4. **Update `reassess-roadmap.md` prompt:**
   - Add a new instruction before the "If changes are needed" section: "Use `gsd_reassess_roadmap` to persist the assessment and any roadmap changes. Pass: milestoneId, completedSliceId, verdict, assessment text, and sliceChanges with modified/added/removed arrays."
   - The prompt already has "Do not bypass state with manual roadmap-only edits" — augment it with: "when `gsd_reassess_roadmap` is available".
   - Keep the existing file-write instructions as degraded fallback.

5. **Extend `prompt-contracts.test.ts`:**
   - Add test: `replan-slice prompt names gsd_replan_slice as canonical tool` — assert `replan-slice.md` contains `gsd_replan_slice`.
   - Add test: `reassess-roadmap prompt names gsd_reassess_roadmap as canonical tool` — assert `reassess-roadmap.md` contains `gsd_reassess_roadmap`.
   - Update the existing test at line 170 (`"replan-slice prompt requires DB-backed planning state when available"`) if the new prompt content makes the old assertion redundant — the existing test checks for generic "DB-backed planning tool" language, the new test checks for the specific tool name.

## Must-Haves

- [ ] `gsd_replan_slice` registered in db-tools.ts with TypeBox schema and alias `gsd_slice_replan`
- [ ] `gsd_reassess_roadmap` registered in db-tools.ts with TypeBox schema and alias `gsd_roadmap_reassess`
- [ ] `replan-slice.md` contains `gsd_replan_slice` as canonical tool name
- [ ] `reassess-roadmap.md` contains `gsd_reassess_roadmap` as canonical tool name
- [ ] Prompt contract tests pass asserting tool name presence in both prompts
- [ ] Existing prompt contract tests still pass (no regressions)

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — all tests pass including new assertions
- `grep -q 'gsd_replan_slice' src/resources/extensions/gsd/prompts/replan-slice.md` — exits 0
- `grep -q 'gsd_reassess_roadmap' src/resources/extensions/gsd/prompts/reassess-roadmap.md` — exits 0
- `grep -q 'gsd_replan_slice' src/resources/extensions/gsd/bootstrap/db-tools.ts` — exits 0
- `grep -q 'gsd_reassess_roadmap' src/resources/extensions/gsd/bootstrap/db-tools.ts` — exits 0

## Inputs

- `src/resources/extensions/gsd/tools/replan-slice.ts` — handler created in T01
- `src/resources/extensions/gsd/tools/reassess-roadmap.ts` — handler created in T02
- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — existing registration patterns for plan_slice, plan_task
- `src/resources/extensions/gsd/prompts/replan-slice.md` — existing prompt template
- `src/resources/extensions/gsd/prompts/reassess-roadmap.md` — existing prompt template
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — existing prompt contract tests

## Expected Output

- `src/resources/extensions/gsd/bootstrap/db-tools.ts` — modified with two new tool registrations
- `src/resources/extensions/gsd/prompts/replan-slice.md` — modified to name `gsd_replan_slice`
- `src/resources/extensions/gsd/prompts/reassess-roadmap.md` — modified to name `gsd_reassess_roadmap`
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — modified with new tool name assertions
