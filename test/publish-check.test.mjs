import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");

async function fakeNpm(body) {
  const dir = await mkdtemp(path.join(tmpdir(), "poteto-npm-"));
  const bin = path.join(dir, "npm");
  const log = path.join(dir, "log");
  await writeFile(bin, `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(log)}\n${body}\n`);
  await chmod(bin, 0o755);
  return { bin: dir, log };
}

test("check mode does not call npm publish when the version is absent", async () => {
  const fake = await fakeNpm("echo 'E404 Not Found' >&2\nexit 1");
  const { stdout } = await exec(process.execPath, ["scripts/publish-if-absent.mjs", "--check"], {
    cwd: root,
    env: { ...process.env, PATH: `${fake.bin}:${process.env.PATH}` },
  });
  assert.match(stdout, /is not on the registry; publish would run/);
  const { stdout: log } = await exec("cat", [fake.log]);
  assert.match(log, /^view /);
  assert.equal(log.includes("publish"), false);
});

test("an existing registry version skips npm publish", async () => {
  const fake = await fakeNpm("printf '%s\\n' '\"0.15.44\"'\nexit 0");
  const { stdout } = await exec(process.execPath, ["scripts/publish-if-absent.mjs"], {
    cwd: root,
    env: { ...process.env, PATH: `${fake.bin}:${process.env.PATH}` },
  });
  assert.match(stdout, /already on the registry; skip npm publish/);
  const { stdout: log } = await exec("cat", [fake.log]);
  assert.equal(log.includes("publish"), false);
});
