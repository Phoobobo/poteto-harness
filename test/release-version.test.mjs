import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { decidePublish } from "../scripts/publish-decision.mjs";
import { readJson } from "../src/validate.mjs";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const checker = path.join(root, "scripts", "check-release-version.mjs");

test("v0.15.44 matches the Phoobobo repository url", async () => {
  const { stdout } = await exec(process.execPath, [checker], {
    cwd: root,
    env: { ...process.env, RELEASE_TAG: "v0.15.44", GITHUB_REF: "" },
  });
  assert.match(stdout, /version 0\.15\.44 matches git\+https:\/\/github\.com\/Phoobobo\/poteto-harness\.git/);
  const pkg = await readJson(path.join(root, "package.json"));
  assert.equal(pkg.repository.url, "git+https://github.com/Phoobobo/poteto-harness.git");
});

test("a different tag fails the version check", async () => {
  await assert.rejects(
    exec(process.execPath, [checker], {
      cwd: root,
      env: { ...process.env, RELEASE_TAG: "v0.15.45", GITHUB_REF: "" },
    }),
  );
});

test("an already published version is not published again", () => {
  assert.equal(decidePublish("0.15.44", "0.15.44"), "skip");
  assert.equal(decidePublish(null, "0.15.44"), "publish");
  assert.throws(() => decidePublish("0.15.43", "0.15.44"));
});
