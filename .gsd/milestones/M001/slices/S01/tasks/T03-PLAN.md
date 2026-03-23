---
estimated_steps: 4
estimated_files: 8
skills_used:
  - create-gsd-extension
  - debug-like-expert
  - test
  - best-practices
---

# T03: Migrate planning prompts and enforce rogue-write detection

**Slice:** S01 — Schema v8 + plan_milestone tool + ROADMAP renderer
**Milestone:** M001

## Description

Switch the planning prompts from direct markdown-writing instructions to DB tool usage, then extend the existing rogue-file safety net so roadmap or plan files written directly to disk are detected as prompt contract violations. This closes the loop between tool availability and LLM compliance.

## Steps

1. Update the planning prompts to instruct the model to call planning tools instead of writing roadmap/plan files directly, while preserving the existing context variables and planning quality constraints.
2. Extend `detectRogueFileWrites()` in `src/resources/extensions/gsd/auto-post-unit.ts` so plan-milestone / planning flows can flag direct `ROADMAP.md` and `PLAN.md` writes without matching DB state.
3. Add or update prompt contract tests proving the planning prompts reference the tool path and no longer contain direct file-write instructions.
4. Add rogue-detection tests that exercise direct roadmap/plan writes and verify those paths are surfaced immediately.

## Must-Haves

- [ ] `plan-milestone` and `guided-plan-milestone` prompts point at the DB tool path instead of direct roadmap writes.
- [ ] `plan-slice`, `replan-slice`, and `reassess-roadmap` prompts are updated consistently for the new planning-tool era, even if their handlers arrive in later slices.
- [ ] Rogue detection flags direct roadmap/plan writes that bypass DB state.
- [ ] Tests fail if prompt text regresses back to manual file-writing instructions.

## Verification

- `node --test src/resources/extensions/gsd/tests/prompt-contracts.test.ts src/resources/extensions/gsd/tests/rogue-file-detection.test.ts`
- Confirm the prompt contract tests specifically assert planning-tool references and absence of manual roadmap/plan write instructions.

## Observability Impact

- Signals added/changed: prompt-contract failures and rogue-write diagnostics for planning artifacts.
- How a future agent inspects this: run `node --test src/resources/extensions/gsd/tests/prompt-contracts.test.ts src/resources/extensions/gsd/tests/rogue-file-detection.test.ts` and inspect `detectRogueFileWrites()` behavior.
- Failure state exposed: prompt regressions or direct roadmap/plan bypasses surface as explicit test failures and rogue-file diagnostics.

## Inputs

- `src/resources/extensions/gsd/prompts/plan-milestone.md` — milestone planning prompt to migrate
- `src/resources/extensions/gsd/prompts/guided-plan-milestone.md` — guided milestone planning prompt to migrate
- `src/resources/extensions/gsd/prompts/plan-slice.md` — adjacent planning prompt that must stay consistent with the tool path
- `src/resources/extensions/gsd/prompts/replan-slice.md` — adjacent planning prompt that must stop implying direct file edits
- `src/resources/extensions/gsd/prompts/reassess-roadmap.md` — adjacent planning prompt that must stay aligned with roadmap rendering rules
- `src/resources/extensions/gsd/auto-post-unit.ts` — existing rogue-write detection logic to extend
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — contract-test harness for prompt migration
- `src/resources/extensions/gsd/tests/rogue-file-detection.test.ts` — regression coverage for rogue writes

## Expected Output

- `src/resources/extensions/gsd/prompts/plan-milestone.md` — tool-driven milestone planning instructions
- `src/resources/extensions/gsd/prompts/guided-plan-milestone.md` — tool-driven guided milestone planning instructions
- `src/resources/extensions/gsd/prompts/plan-slice.md` — updated planning-tool language aligned with the new capture model
- `src/resources/extensions/gsd/prompts/replan-slice.md` — updated planning-tool language aligned with the new capture model
- `src/resources/extensions/gsd/prompts/reassess-roadmap.md` — updated planning-tool language aligned with the new capture model
- `src/resources/extensions/gsd/auto-post-unit.ts` — roadmap/plan rogue-write detection
- `src/resources/extensions/gsd/tests/prompt-contracts.test.ts` — assertions for planning-tool prompt migration
- `src/resources/extensions/gsd/tests/rogue-file-detection.test.ts` — rogue detection coverage for roadmap/plan artifacts
