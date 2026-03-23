---
estimated_steps: 4
estimated_files: 4
skills_used: []
---

# T01: Implement replan_slice handler with structural enforcement

**Slice:** S03 — replan_slice + reassess_roadmap with structural enforcement
**Milestone:** M001

## Description

Build the `handleReplanSlice()` handler that structurally enforces preservation of completed tasks during replanning. This task also adds required DB helper functions (`insertReplanHistory`, `insertAssessment`, `deleteTask`, `deleteSlice`) and markdown renderers (`renderReplanFromDb`, `renderAssessmentFromDb`) that both the replan and reassess handlers use.

The handler follows the established validate → enforce → transaction → render → invalidate pattern from `plan-slice.ts`. The novel addition is the structural enforcement step: before writing any mutations, query `getSliceTasks()` and reject the operation if any `updatedTasks[].taskId` or `removedTaskIds` element matches a task with status `complete` or `done`.

## Steps

1. **Add DB helper functions to `gsd-db.ts`:**
   - `insertReplanHistory(entry)` — INSERT into `replan_history` table. Columns: milestone_id, slice_id, task_id (nullable, the blocker task), summary, previous_artifact_path, replacement_artifact_path, created_at.
   - `insertAssessment(entry)` — INSERT OR REPLACE into `assessments` table (path is PK). Columns: path, milestone_id, slice_id, task_id, status, scope, full_content, created_at.
   - `deleteTask(milestoneId, sliceId, taskId)` — Must first DELETE from `verification_evidence WHERE task_id = :tid AND slice_id = :sid AND milestone_id = :mid`, then DELETE from `tasks WHERE ...`. The `verification_evidence` table has a FK referencing tasks — deleting evidence first avoids FK constraint violations.
   - `deleteSlice(milestoneId, sliceId)` — Must delete all child verification_evidence rows, then all child task rows, then the slice row. Use cascade-style manual deletion.

2. **Add renderers to `markdown-renderer.ts`:**
   - `renderReplanFromDb(basePath, milestoneId, sliceId, replanData)` — Generates REPLAN.md with blocker description, what changed, and summary. Uses `writeAndStore()` with artifact_type `"REPLAN"`. The `replanData` param includes blockerTaskId, blockerDescription, whatChanged. Path: `{sliceDir}/{sliceId}-REPLAN.md`.
   - `renderAssessmentFromDb(basePath, milestoneId, sliceId, assessmentData)` — Generates ASSESSMENT.md with verdict, assessment text. Uses `writeAndStore()` with artifact_type `"ASSESSMENT"`. Path: `{sliceDir}/{sliceId}-ASSESSMENT.md`.

3. **Create `tools/replan-slice.ts` with `handleReplanSlice()`:**
   - Interface `ReplanSliceParams`: milestoneId, sliceId, blockerTaskId, blockerDescription, whatChanged, updatedTasks (array of {taskId, title, description, estimate, files, verify, inputs, expectedOutput}), removedTaskIds (string array).
   - Validate all required fields (same `isNonEmptyString` pattern as plan-slice.ts).
   - Query `getSlice()` to verify parent slice exists.
   - Query `getSliceTasks()` to get all tasks. Build a Set of completed task IDs (status === 'complete' || status === 'done').
   - **Structural enforcement**: Check if any `updatedTasks[].taskId` is in the completed set → return `{ error: "cannot modify completed task T0X" }`. Check if any `removedTaskIds` element is in the completed set → return `{ error: "cannot remove completed task T0X" }`.
   - In `transaction()`: call `insertReplanHistory()` with the replan metadata. For each updatedTask: if task exists, use `upsertTaskPlanning()` to update planning fields; if new, use `insertTask()` then `upsertTaskPlanning()`. For each removedTaskId: call `deleteTask()`.
   - After transaction: call `renderPlanFromDb()` to re-render PLAN.md and task plans. Call `renderReplanFromDb()` to write REPLAN.md. Call `invalidateStateCache()` and `clearParseCache()`.
   - Return `{ milestoneId, sliceId, replanPath, planPath }` on success.

4. **Write `tests/replan-handler.test.ts`:**
   - Use `node:test` (import test from 'node:test') and `node:assert/strict`. Follow the exact test setup pattern from `plan-slice.test.ts`: `makeTmpBase()`, `openDatabase()`, `cleanup()`, seed parent milestone+slice+tasks.
   - Test cases:
     - Validation failure (missing milestoneId) → returns `{ error }` containing "validation failed"
     - Structural rejection: seed T01 as complete, T02 as pending. Call replan with updatedTasks targeting T01. Assert error contains "completed task" and "T01".
     - Structural rejection: seed T01 as complete. Call replan with removedTaskIds containing T01. Assert error contains "completed task".
     - Successful replan: seed T01 complete, T02 pending, T03 pending. Call replan updating T02 and removing T03 and adding T04. Assert success. Verify replan_history row exists in DB. Verify T02 updated in DB. Verify T03 deleted from DB. Verify T04 exists in DB. Verify rendered PLAN.md exists on disk. Verify REPLAN.md exists on disk.
     - Cache invalidation: verify that re-parsing the PLAN.md after replan reflects the mutations (parse-visible state assertion).
     - Idempotent rerun: call replan twice with same params, assert second call also succeeds.

## Must-Haves

- [ ] `insertReplanHistory()`, `insertAssessment()`, `deleteTask()`, `deleteSlice()` exported from `gsd-db.ts`
- [ ] `deleteTask()` handles FK constraint by deleting verification_evidence first
- [ ] `renderReplanFromDb()` and `renderAssessmentFromDb()` exported from `markdown-renderer.ts`
- [ ] `handleReplanSlice()` exported from `tools/replan-slice.ts`
- [ ] Structural rejection returns error naming the specific completed task ID
- [ ] Successful replan writes `replan_history` row with blocker metadata
- [ ] Successful replan re-renders PLAN.md and writes REPLAN.md via `writeAndStore()`
- [ ] Cache invalidation via `invalidateStateCache()` + `clearParseCache()` after render
- [ ] All tests in `replan-handler.test.ts` pass

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/replan-handler.test.ts` — all tests pass
- Structural rejection tests prove completed tasks cannot be mutated
- DB persistence tests prove replan_history row exists after successful replan

## Observability Impact

- Signals added/changed: Replan handler error payloads include the specific completed task IDs that blocked the mutation
- How a future agent inspects this: Query `replan_history` table, read rendered REPLAN.md, check PLAN.md for updated task list
- Failure state exposed: Validation errors, structural rejection errors, render failures return distinct `{ error: string }` payloads

## Inputs

- `src/resources/extensions/gsd/gsd-db.ts` — existing DB functions: `getSliceTasks()`, `getTask()`, `getSlice()`, `insertTask()`, `upsertTaskPlanning()`, `transaction()`, `insertArtifact()`
- `src/resources/extensions/gsd/markdown-renderer.ts` — existing `writeAndStore()` pattern, `renderPlanFromDb()` for PLAN.md re-rendering
- `src/resources/extensions/gsd/tools/plan-slice.ts` — reference handler pattern (validate → transaction → render → invalidate)
- `src/resources/extensions/gsd/tests/plan-slice.test.ts` — reference test pattern (setup, seed, assert)
- `src/resources/extensions/gsd/state.ts` — `invalidateStateCache()` import
- `src/resources/extensions/gsd/files.ts` — `clearParseCache()` import

## Expected Output

- `src/resources/extensions/gsd/gsd-db.ts` — modified with 4 new exported functions
- `src/resources/extensions/gsd/markdown-renderer.ts` — modified with 2 new renderer functions
- `src/resources/extensions/gsd/tools/replan-slice.ts` — new handler file
- `src/resources/extensions/gsd/tests/replan-handler.test.ts` — new test file
