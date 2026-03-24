/**
 * decisions-data-loss.test.ts — Regression tests for #2301.
 *
 * Tests the freeform decision parser fallback and the regeneration safety guard
 * that prevent gsd_decision_save from destroying DECISIONS.md.
 */

import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  openDatabase,
  closeDatabase,
  getDecisionById,
} from "../gsd-db.ts";
import { parseDecisionsTable, migrateFromMarkdown } from "../md-importer.ts";
import { saveDecisionToDb } from "../db-writer.ts";

function makeTmpDir(): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gsd-decisions-2301-")));
  fs.mkdirSync(path.join(dir, ".gsd"), { recursive: true });
  return dir;
}

// ─── Freeform Parser Tests ─────────────────────────────────────────────────

test("#2301: freeform parser extracts fields from ## DXXX headings", () => {
  const freeformMd = `# Decisions

## D001: Use SQLite for local state
**Scope:** architecture
**Decision:** Use SQLite for local state
**Choice:** better-sqlite3
**Rationale:** Fast, single-file, no server needed
**Revisable:** Yes
**Made By:** collaborative

## D002: API layer design
**Date:** M001
**Scope:** api
**Decision:** REST over GraphQL
**Choice:** Express.js REST API
**Rationale:** Simpler for CLI-first tool

## D003 — Minimal heading only
`;

  const decisions = parseDecisionsTable(freeformMd);
  assert.equal(decisions.length, 3, "finds all 3 decisions");
  assert.equal(decisions[0].id, "D001");
  assert.equal(decisions[0].scope, "architecture");
  assert.equal(decisions[0].choice, "better-sqlite3");
  assert.equal(decisions[0].made_by, "collaborative");
  assert.equal(decisions[1].id, "D002");
  assert.equal(decisions[1].when_context, "M001", "Date → when_context");
  assert.equal(decisions[2].id, "D003");
  assert.equal(decisions[2].decision, "Minimal heading only", "title from heading");
});

test("#2301: freeform parser handles ### and #### headings", () => {
  const md = `# Decisions
### D010: Triple hash
**Scope:** testing
**Decision:** Use node:test

#### D011: Quadruple hash
**Scope:** ci
**Decision:** GitHub Actions

## D012 — Em dash separator
**Scope:** build
**Decision:** esbuild
`;

  const decisions = parseDecisionsTable(md);
  assert.equal(decisions.length, 3);
  assert.equal(decisions[0].id, "D010");
  assert.equal(decisions[1].id, "D011");
  assert.equal(decisions[2].id, "D012");
});

test("#2301: missing fields default safely", () => {
  const md = `# Decisions
## D020: Only a title, no fields at all

## D021: Has scope only
**Scope:** testing
`;

  const decisions = parseDecisionsTable(md);
  assert.equal(decisions.length, 2);
  assert.equal(decisions[0].decision, "Only a title, no fields at all");
  assert.equal(decisions[0].scope, "");
  assert.equal(decisions[0].choice, "");
  assert.equal(decisions[0].revisable, "Yes");
  assert.equal(decisions[0].made_by, "agent");
  assert.equal(decisions[1].scope, "testing");
});

test("#2301: table format takes strict priority over freeform", () => {
  const md = `# Decisions Register
| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | DB pick | SQLite | Fast | Yes |

## D002: This freeform heading should be ignored
**Scope:** ignored
`;

  const decisions = parseDecisionsTable(md);
  assert.equal(decisions.length, 1, "only table rows returned");
  assert.equal(decisions[0].id, "D001");
});

test("#2301: empty and non-decision content returns empty array", () => {
  assert.equal(parseDecisionsTable("# Decisions\n\nNo decisions yet.\n").length, 0);
  assert.equal(parseDecisionsTable("## Introduction\nNot a decision.\n").length, 0);
});

test("#2301: freeform e2e through migrateFromMarkdown", () => {
  const tmpDir = makeTmpDir();
  const gsdDir = path.join(tmpDir, ".gsd");

  fs.writeFileSync(path.join(gsdDir, "DECISIONS.md"), `# Decisions

## D001: Use SQLite
**Scope:** architecture
**Decision:** Use SQLite for state
**Choice:** better-sqlite3
**Rationale:** Fast and embedded

## D002: REST API
**Scope:** api
**Decision:** REST over GraphQL
**Choice:** Express.js

## D003: TypeScript
**Scope:** language
**Decision:** Use TypeScript
**Choice:** TypeScript 5.x
`);

  openDatabase(path.join(gsdDir, "gsd.db"));
  try {
    const result = migrateFromMarkdown(tmpDir);
    assert.equal(result.decisions, 3, "all 3 freeform decisions imported");
    assert.ok(getDecisionById("D001"), "D001 in DB");
    assert.ok(getDecisionById("D002"), "D002 in DB");
    assert.ok(getDecisionById("D003"), "D003 in DB");
    assert.equal(getDecisionById("D001")?.scope, "architecture");
  } finally {
    closeDatabase();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Regeneration Guard Tests ──────────────────────────────────────────────

test("#2301: guard blocks overwrite when DB has fewer decisions than file", async () => {
  const tmpDir = makeTmpDir();
  const mdPath = path.join(tmpDir, ".gsd", "DECISIONS.md");

  fs.writeFileSync(mdPath, `# Decisions
## D001: First
**Scope:** arch
## D002: Second
**Scope:** impl
## D003: Third
**Scope:** api
`);

  openDatabase(path.join(tmpDir, ".gsd", "gsd.db"));
  try {
    await saveDecisionToDb({
      scope: "test", decision: "New", choice: "A", rationale: "Testing",
    }, tmpDir);

    // File should be preserved (DB=1 < file=3)
    const content = fs.readFileSync(mdPath, "utf-8");
    assert.ok(content.includes("## D001: First"), "D001 preserved");
    assert.ok(content.includes("## D002: Second"), "D002 preserved");
    assert.ok(content.includes("## D003: Third"), "D003 preserved");
  } finally {
    closeDatabase();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("#2301: guard allows write when DB >= file", async () => {
  const tmpDir = makeTmpDir();
  const mdPath = path.join(tmpDir, ".gsd", "DECISIONS.md");

  openDatabase(path.join(tmpDir, ".gsd", "gsd.db"));
  try {
    await saveDecisionToDb({ scope: "a", decision: "First", choice: "A", rationale: "R" }, tmpDir);
    await saveDecisionToDb({ scope: "b", decision: "Second", choice: "B", rationale: "R" }, tmpDir);

    assert.ok(fs.existsSync(mdPath), "file written");
    const content = fs.readFileSync(mdPath, "utf-8");
    assert.ok(content.includes("D001"), "D001 in file");
    assert.ok(content.includes("D002"), "D002 in file");
    assert.ok(content.includes("|"), "table format");
  } finally {
    closeDatabase();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("#2301: full e2e — freeform → migrate → save → all decisions survive", async () => {
  const tmpDir = makeTmpDir();
  const gsdDir = path.join(tmpDir, ".gsd");
  const mdPath = path.join(gsdDir, "DECISIONS.md");

  fs.writeFileSync(mdPath, `# Decisions
## D001: Arch
**Scope:** arch
**Decision:** Monorepo
## D002: DB
**Scope:** data
**Decision:** SQLite
## D003: Lang
**Scope:** lang
**Decision:** TypeScript
`);

  openDatabase(path.join(gsdDir, "gsd.db"));
  try {
    const migResult = migrateFromMarkdown(tmpDir);
    assert.equal(migResult.decisions, 3, "migration imported all 3");

    const saveResult = await saveDecisionToDb({
      scope: "new", decision: "Added later", choice: "Yes", rationale: "Needed",
    }, tmpDir);
    assert.equal(saveResult.id, "D004", "new decision gets D004");

    // DB=4 >= file=3 → file regenerated with all 4
    const content = fs.readFileSync(mdPath, "utf-8");
    assert.ok(content.includes("D001"), "D001 survived");
    assert.ok(content.includes("D003"), "D003 survived");
    assert.ok(content.includes("D004"), "D004 added");
  } finally {
    closeDatabase();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
