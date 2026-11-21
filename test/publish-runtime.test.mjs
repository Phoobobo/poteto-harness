import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { MIN_NODE, MIN_NPM, parseSemver, versionAtLeast } from "../scripts/publish-runtime.mjs";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const checker = path.join(root, "scripts", "check-publish-runtime.mjs");

test("trusted publishing floors reject the initial CI runtime", () => {
  assert.deepEqual(MIN_NODE, [22, 14, 0]);
  assert.deepEqual(MIN_NPM, [11, 5, 1]);
  assert.equal(versionAtLeast(parseSemver("v22.23.5"), MIN_NODE), true);
  assert.equal(versionAtLeast(parseSemver("22.14.0"), MIN_NODE), true);
  assert.equal(versionAtLeast(parseSemver("22.13.9"), MIN_NODE), false);
  assert.equal(versionAtLeast(parseSemver("10.9.9"), MIN_NPM), false);
  assert.equal(versionAtLeast(parseSemver("11.5.0"), MIN_NPM), false);
  assert.equal(versionAtLeast(parseSemver("11.4.2"), MIN_NPM), false);
  assert.equal(versionAtLeast(parseSemver("11.5.1"), MIN_NPM), true);
  assert.equal(versionAtLeast(parseSemver("11.19.1"), MIN_NPM), true);
  assert.equal(parseSemver("11.5.1-pre"), null);
  assert.equal(parseSemver("11.5.1\n11.5.1"), null);
  assert.equal(versionAtLeast(null, MIN_NPM), false);
});

test("a PATH npm that disagrees with the node install fails closed", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "poteto-npmver-"));
  const bin = path.join(dir, "npm");
  await writeFile(bin, "#!/bin/sh\nprintf '%s\\n' '0.0.0'\n");
  await chmod(bin, 0o755);
  await assert.rejects(
    exec(process.execPath, [checker], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}:${path.dirname(process.execPath)}:/usr/bin:/bin`,
        SKIP_PUBLISH_RUNTIME: "1",
        NPM_VERSION: "11.5.1",
      },
    }),
    (error) => {
      assert.notEqual(error.code, 0);
      assert.match(error.stdout, /npm=0\.0\.0/);
      assert.match(error.stderr, /npm on PATH is 0\.0\.0/);
      return true;
    },
  );
});

test("the runtime check reports the node install and has no success override", async () => {
  const nodeDir = path.dirname(process.execPath);
  const measured = await exec(path.join(nodeDir, "npm"), ["--version"], { encoding: "utf8" });
  const npmVersion = measured.stdout.trim();
  const expectOk =
    versionAtLeast(parseSemver(process.version), MIN_NODE) &&
    versionAtLeast(parseSemver(npmVersion), MIN_NPM);
  let failed = false;
  let stdout = "";
  let stderr = "";
  try {
    const result = await exec(process.execPath, [checker], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PATH: `${nodeDir}:/usr/bin:/bin` },
    });
    stdout = result.stdout;
    stderr = result.stderr ?? "";
  } catch (error) {
    failed = true;
    stdout = error.stdout ?? "";
    stderr = error.stderr ?? "";
  }
  assert.equal(
    stdout.trim(),
    `publish-runtime node=${process.version} npm=${npmVersion} bundled-npm=${npmVersion}`,
  );
  assert.equal(failed, !expectOk);
  if (!expectOk) assert.match(stderr, /trusted publishing needs node>=22\.14\.0 and npm>=11\.5\.1/);
});

test("arguments cannot force the runtime check to pass", async () => {
  const source = await readFile(checker, "utf8");
  assert.equal(source.includes("SKIP_PUBLISH_RUNTIME"), false);
  assert.equal(/process\.exit\((?!1\))/.test(source), false);
  await assert.rejects(
    exec(process.execPath, [checker, "--npm", "11.5.1"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` },
    }),
    (error) => {
      assert.match(error.stderr, /does not accept arguments/);
      return true;
    },
  );
});

test("ci and publish use Node 24 and the same runtime check", async () => {
  const ci = await readFile(path.join(root, ".github", "workflows", "ci.yml"), "utf8");
  const publish = await readFile(path.join(root, ".github", "workflows", "publish.yml"), "utf8");
  for (const text of [ci, publish]) {
    assert.match(text, /actions\/setup-node@v4/);
    assert.match(text, /node-version: 24\n/);
    assert.equal(text.includes("node-version: 22"), false);
    assert.equal(text.includes("continue-on-error"), false);
    assert.equal(text.includes("NPM_TOKEN"), false);
    assert.equal(text.includes("secrets."), false);
    for (const line of text.split("\n")) {
      if (line.includes("check-publish-runtime.mjs")) {
        assert.match(line, /^\s*- run: node scripts\/check-publish-runtime\.mjs\s*$/);
      }
    }
  }
  assert.equal(ci.includes("id-token:"), false);
  assert.match(publish, /types: \[published\]/);
  assert.match(publish, /id-token: write/);
  assert.match(publish, /contents: read/);
  assert.match(publish, /runs-on: ubuntu-latest/);
  assert.match(publish, /registry-url: https:\/\/registry\.npmjs\.org/);
  assert.match(publish, /package-manager-cache: false/);
  assert.equal(publish.includes("npm publish"), false);
  assert.equal(publish.includes("npm stage"), false);
  const setup = publish.indexOf("actions/setup-node@v4");
  const ciCommand = publish.indexOf("run: npm ci");
  const releaseCheck = publish.indexOf("node scripts/check-release-version.mjs");
  const publishCommand = publish.indexOf("node scripts/publish-if-absent.mjs");
  const checks = [...publish.matchAll(/node scripts\/check-publish-runtime\.mjs/g)].map((match) => match.index);
  assert.equal(checks.length, 2);
  assert.ok(setup < checks[0] && checks[0] < ciCommand);
  assert.ok(releaseCheck < checks[1] && checks[1] < publishCommand);
  const ciSetup = ci.indexOf("actions/setup-node@v4");
  const ciInstall = ci.indexOf("run: npm ci");
  const ciCheck = ci.indexOf("node scripts/check-publish-runtime.mjs");
  assert.equal([...ci.matchAll(/node scripts\/check-publish-runtime\.mjs/g)].length, 1);
  assert.ok(ciSetup < ciCheck && ciCheck < ciInstall);
});
