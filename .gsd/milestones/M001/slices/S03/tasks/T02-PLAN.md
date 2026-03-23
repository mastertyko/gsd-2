---
estimated_steps: 2
estimated_files: 2
skills_used: []
---

# T02: Implement reassess_roadmap handler with structural enforcement

**Slice:** S03 — replan_slice + reassess_roadmap with structural enforcement
**Milestone:** M001

## Description

Build the `handleReassessRoadmap()` handler that structurally enforces preservation of completed slices during roadmap reassessment. This handler follows the identical control flow pattern as `handleReplanSlice()` from T01 but operates at the milestone/slice level instead of the slice/task level. It reuses the DB helpers (`insertAssessment`, `deleteSlice`) and the `renderAssessmentFromDb()` renderer from T01.

The structural enforcement logic: before writing any mutations, query `getMilestoneSlices()` and reject if any modified or removed slice has status `complete` or `done`.

## Steps

1. **Create `tools/reassess-roadmap.ts` with `handleReassessRoadmap()`:**
   - Interface `ReassessRoadmapParams`: milestoneId, completedSliceId (the slice that just finished), verdict (string — e.g. "confirmed", "adjusted"), assessment (text body), sliceChanges object with: modified (array of {sliceId, title, risk, depends, demo}), added (array of {sliceId, title, risk, depends, demo}), removed (array of sliceId strings).
   - Validate all required fields. `sliceChanges` must be an object with modified, added, removed arrays (can be empty arrays but must exist).
   - Query `getMilestone()` to verify milestone exists.
   - Query `getMilestoneSlices()` to get all slices. Build a Set of completed slice IDs (status === 'complete' || status === 'done').
   - **Structural enforcement**: Check if any `sliceChanges.modified[].sliceId` is in the completed set → return `{ error: "cannot modify completed slice S0X" }`. Check if any `sliceChanges.removed[]` element is in the completed set → return `{ error: "cannot remove completed slice S0X" }`.
   - Compute assessment artifact path: `{sliceDir}/{completedSliceId}-ASSESSMENT.md` (the assessment lives in the completed slice's directory).
   - In `transaction()`: call `insertAssessment()` with path (PK), milestone_id, status=verdict, scope='roadmap', full_content=assessment text, created_at. For each modified slice: call `upsertSlicePlanning()` to update title/risk/depends/demo. For each added slice: call `insertSlice()` with id, milestoneId, title, status='pending', demo. For each removed sliceId: call `deleteSlice()`.
   - After transaction: call `renderRoadmapFromDb()` to re-render ROADMAP.md. Call `renderAssessmentFromDb()` to write ASSESSMENT.md. Call `invalidateStateCache()` and `clearParseCache()`.
   - Return `{ milestoneId, completedSliceId, assessmentPath, roadmapPath }` on success.

2. **Write `tests/reassess-handler.test.ts`:**
   - Use `node:test` and `node:assert/strict`. Follow the setup pattern from `plan-slice.test.ts`: temp directory with `.gsd/milestones/M001/` structure, `openDatabase()`, seed milestone with S01 (complete), S02 (pending), S03 (pending).
   - Test cases:
     - Validation failure (missing milestoneId) → returns `{ error }` containing "validation failed"
     - Missing milestone → returns `{ error }` containing "not found"
     - Structural rejection: call reassess with modified containing S01 (complete). Assert error contains "completed slice" and "S01".
     - Structural rejection: call reassess with removed containing S01 (complete). Assert error contains "completed slice".
     - Successful reassess: modify S02 title/demo, add S04, remove S03. Assert success. Verify assessments row exists in DB (query by path). Verify S02 updated in DB. Verify S03 deleted from DB. Verify S04 exists in DB. Verify ROADMAP.md re-rendered on disk. Verify ASSESSMENT.md exists on disk.
     - Cache invalidation: verify parse-visible state reflects mutations.
     - Idempotent rerun: call reassess twice, second also succeeds (INSERT OR REPLACE on assessments path PK).

## Must-Haves

- [ ] `handleReassessRoadmap()` exported from `tools/reassess-roadmap.ts`
- [ ] Structural rejection returns error naming the specific completed slice ID
- [ ] Successful reassess writes `assessments` row with path PK and assessment content
- [ ] Successful reassess re-renders ROADMAP.md and writes ASSESSMENT.md via renderers
- [ ] Cache invalidation via `invalidateStateCache()` + `clearParseCache()` after render
- [ ] All tests in `reassess-handler.test.ts` pass

## Verification

- `node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/resources/extensions/gsd/tests/reassess-handler.test.ts` — all tests pass
- Structural rejection tests prove completed slices cannot be mutated
- DB persistence tests prove assessments row exists after successful reassess

## Observability Impact

- Signals added/changed: Reassess handler error payloads include the specific completed slice IDs that blocked the mutation
- How a future agent inspects this: Query `assessments` table by path, read rendered ASSESSMENT.md, check ROADMAP.md for updated slice list
- Failure state exposed: Validation errors, structural rejection errors, render failures return distinct `{ error: string }` payloads

## Inputs

- `src/resources/extensions/gsd/gsd-db.ts` — `getMilestoneSlices()`, `getMilestone()`, `insertSlice()`, `upsertSlicePlanning()`, `insertAssessment()`, `deleteSlice()`, `transaction()` (the last two added by T01)
- `src/resources/extensions/gsd/markdown-renderer.ts` — `renderRoadmapFromDb()`, `renderAssessmentFromDb()` (the latter added by T01)
- `src/resources/extensions/gsd/tools/replan-slice.ts` — reference handler pattern from T01
- `src/resources/extensions/gsd/tests/replan-handler.test.ts` — reference test pattern from T01
- `src/resources/extensions/gsd/state.ts` — `invalidateStateCache()`
- `src/resources/extensions/gsd/files.ts` — `clearParseCache()`

## Expected Output

- `src/resources/extensions/gsd/tools/reassess-roadmap.ts` — new handler file
- `src/resources/extensions/gsd/tests/reassess-handler.test.ts` — new test file
