import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");

for (const host of ["codex", "pi"]) {
  test(`${host} check-files does not claim a live child`, async () => {
    const { stdout } = await exec("bash", [path.join(root, "scripts", `smoke-${host}.sh`), "check-files"], {
      cwd: root,
    });
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.nativeChild, "not-run");
    assert.equal(parsed.cli, "not-invoked");
  });
}
