import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectDirectory } from "../runtime/inspect.mjs";

const schema = {
  type: "object",
  required: ["findings", "commands"],
  properties: {
    findings: { type: "array" },
    commands: {
      type: "array",
      items: {
        type: "object",
        required: ["argv", "exitCode"],
        properties: { argv: { type: "array" }, exitCode: { type: "number" } },
      },
    },
  },
};
const acceptance = [{ kind: "jsonDocument", path: "result.json", schema }];

test("a marker string is not acceptance", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "poteto-inspect-"));
  await writeFile(path.join(dir, "result.json"), '{"status":"verified-ok"}\n');
  const result = await inspectDirectory(dir, acceptance);
  assert.equal(result.accepted, false);
  assert.equal(result.nativeChildInvoked, false);
});

test("schema-valid bytes get a parent sha256", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "poteto-inspect-"));
  const body = `${JSON.stringify({
    findings: [{ path: "extensions/spawn.ts" }],
    commands: [{ argv: ["node", "--test"], exitCode: 0 }],
  })}\n`;
  await writeFile(path.join(dir, "result.json"), body);
  const result = await inspectDirectory(dir, acceptance);
  assert.equal(result.accepted, true);
  assert.equal(result.digests["result.json"], createHash("sha256").update(body).digest("hex"));
});

test("a string exit code fails the schema", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "poteto-inspect-"));
  await writeFile(
    path.join(dir, "result.json"),
    '{"findings":[],"commands":[{"argv":["node"],"exitCode":"0"}]}\n',
  );
  const result = await inspectDirectory(dir, acceptance);
  assert.equal(result.accepted, false);
});
