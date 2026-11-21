import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import test from "node:test";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");

test("npm pack file list stays inside the allowlist", async () => {
  const { stdout } = await exec("npm", ["pack", "--dry-run", "--json"], { cwd: root });
  const packed = JSON.parse(stdout);
  const files = packed[0].files.map((file) => file.path);
  assert.ok(files.includes("plugin.json"));
  assert.ok(files.includes("LICENSE"));
  assert.ok(files.includes("NOTICE.md"));
  assert.ok(files.includes("skills/poteto-mode/SKILL.md"));
  assert.ok(files.includes("extensions/index.ts"));
  assert.ok(files.includes("extensions/spawn.ts"));
  assert.ok(files.includes("roles/pstack-worker.md"));
  assert.ok(files.includes("roles/pstack-explorer.md"));
  for (const file of files) {
    assert.equal(file.includes("node_modules"), false, file);
    assert.equal(file.includes("trae"), false, file);
    assert.equal(file.includes("grok"), false, file);
    assert.equal(file.startsWith("hosts/"), false, file);
    assert.equal(file.includes(".github"), false, file);
    assert.equal(file.includes(".env"), false, file);
  }
});
