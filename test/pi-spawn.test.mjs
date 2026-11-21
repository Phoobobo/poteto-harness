import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { delegate, childArguments, readSessionModel, PI_ROLES, roleMarkdown } from "../extensions/spawn.ts";

const sessionModel = { provider: "openai", id: "example-model" };

const valid = `${JSON.stringify({
  findings: [{ path: "src/pi/spawn.ts" }],
  commands: [{ argv: ["node", "--test"], exitCode: 0 }],
})}\n`;

async function rolesDir() {
  const dir = await mkdtemp(path.join(tmpdir(), "pstack-pi-roles-"));
  for (const role of PI_ROLES) {
    await writeFile(path.join(dir, role.file), roleMarkdown(role));
  }
  return dir;
}

function fakeSpawn(script) {
  const calls = [];
  return {
    calls,
    spawnImpl({ command, args, cwd }) {
      calls.push({ command, args, cwd });
      const plan = script(calls.length, cwd);
      let settle;
      const closed = new Promise((resolve) => {
        settle = resolve;
      });
      const stdout = (async function* () {
        for (const line of plan.lines ?? []) yield `${line}\n`;
        if (plan.write) await writeFile(path.join(cwd, "result.json"), plan.write);
        if (!plan.hang) settle({ code: plan.code ?? 0, signal: null });
      })();
      return {
        stdout,
        stderr: (async function* () {})(),
        kill() {
          plan.onKill?.();
          settle({ code: null, signal: "SIGTERM" });
          return true;
        },
        closed,
      };
    },
  };
}

const settled = JSON.stringify({ type: "agent_settled", aborted: false });

test("unknown role does not spawn", async () => {
  const roles = await rolesDir();
  const fake = fakeSpawn(() => ({ lines: [settled], write: valid }));
  const result = await delegate({
    tasks: [{ role: "missing", task: "nope" }],
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 1000,
    sessionModel,
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(fake.calls.length, 0);
  assert.equal(result.children[0].status, "failed");
  assert.match(result.children[0].error, /unknown role/);
});

test("parallel children get distinct directories and argv is the documented pi invocation", async () => {
  const roles = await rolesDir();
  const fake = fakeSpawn(() => ({ lines: [settled], write: valid }));
  const result = await delegate({
    tasks: [
      { role: "pstack-explorer", task: "read a" },
      { role: "pstack-worker", task: "write b" },
    ],
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 1000,
    sessionModel,
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(fake.calls.length, 2);
  assert.notEqual(fake.calls[0].cwd, fake.calls[1].cwd);
  assert.deepEqual(fake.calls[0].args.slice(0, 10), [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--no-extensions",
    "--no-skills",
    "--model",
    "openai/example-model",
    "--append-system-prompt",
    fake.calls[0].args[9],
  ]);
  assert.equal(fake.calls[0].args.includes("--api-key"), false);
  const modelAt = fake.calls[0].args.indexOf("--model");
  assert.equal(fake.calls[0].args[modelAt + 1], "openai/example-model");
  assert.equal(result.children.every((child) => child.status === "completed"), true);
});

test("exit 0 with a marker file is a child failure", async () => {
  const roles = await rolesDir();
  const fake = fakeSpawn(() => ({ lines: [settled], write: '{"status":"verified-ok"}\n' }));
  const result = await delegate({
    tasks: [{ role: "pstack-explorer", task: "read" }],
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 1000,
    sessionModel,
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(result.children[0].status, "failed");
  assert.equal(result.children[0].inspectionAccepted, false);
});

test("missing agent_settled is a failure even when the file is valid", async () => {
  const roles = await rolesDir();
  const fake = fakeSpawn(() => ({ lines: [], write: valid }));
  const result = await delegate({
    tasks: [{ role: "pstack-explorer", task: "read" }],
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 1000,
    sessionModel,
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(result.children[0].status, "failed");
  assert.match(result.children[0].error, /agent_settled/);
});

test("a sibling failure does not drop the other child", async () => {
  const roles = await rolesDir();
  const fake = fakeSpawn((n) =>
    n === 1
      ? { lines: [settled], write: '{"status":"verified-ok"}\n', code: 0 }
      : { lines: [settled], write: valid },
  );
  const result = await delegate({
    tasks: [
      { role: "pstack-explorer", task: "bad" },
      { role: "pstack-worker", task: "good" },
    ],
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 1000,
    sessionModel,
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(result.children[0].status, "failed");
  assert.equal(result.children[1].status, "completed");
});

test("timeout kills the child and does not write result.json for it", async () => {
  const roles = await rolesDir();
  let killed = false;
  const fake = fakeSpawn(() => ({
    hang: true,
    lines: [],
    onKill() {
      killed = true;
    },
  }));
  const result = await delegate({
    tasks: [{ role: "pstack-explorer", task: "hang" }],
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 40,
    sessionModel,
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(killed, true);
  assert.equal(result.children[0].status, "timed_out");
  assert.equal(result.children[0].inspectionAccepted, false);
});

test("abort before start does not spawn", async () => {
  const roles = await rolesDir();
  const fake = fakeSpawn(() => ({ lines: [settled], write: valid }));
  const controller = new AbortController();
  controller.abort();
  const result = await delegate({
    tasks: [{ role: "pstack-explorer", task: "nope" }],
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 1000,
    sessionModel,
    signal: controller.signal,
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(fake.calls.length, 0);
  assert.equal(result.children[0].status, "aborted");
});

test("more than eight tasks are rejected before spawn", async () => {
  const roles = await rolesDir();
  const fake = fakeSpawn(() => ({ lines: [settled], write: valid }));
  const tasks = Array.from({ length: 9 }, (_, index) => ({ role: "pstack-explorer", task: String(index) }));
  const result = await delegate({
    tasks,
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 1000,
    sessionModel,
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(fake.calls.length, 0);
  assert.match(result.error, /too many/);
});

test("child argv matches childArguments", () => {
  const args = childArguments(
    {
      name: "pstack-explorer",
      description: "d",
      tools: ["read", "grep"],
      filePath: "/roles/pstack-explorer.md",
    },
    "look",
    "/repo",
    "/tmp/out",
    { provider: "openai", id: "example-model", thinking: "high" },
  );
  assert.equal(args.includes("--api-key"), false);
  const modelAt = args.indexOf("--model");
  assert.equal(args[modelAt + 1], "openai/example-model");
  const thinkingAt = args.indexOf("--thinking");
  assert.equal(args[thinkingAt + 1], "high");
  assert.deepEqual(args.slice(0, 4), ["--mode", "json", "-p", "--no-session"]);
  assert.equal(args.at(-2), "--");
  assert.match(args.at(-1), /Working directory for writes: \/tmp\/out/);
  assert.match(args.at(-1), /not a security sandbox/);
});

test("missing session model does not spawn", async () => {
  const roles = await rolesDir();
  const fake = fakeSpawn(() => ({ lines: [settled], write: valid }));
  const result = await delegate({
    tasks: [{ role: "pstack-explorer", task: "read" }],
    repo: "/repo",
    rolesDir: roles,
    piCommand: "pi",
    timeoutMs: 1000,
    sessionModel: { provider: "", id: "" },
    spawnImpl: fake.spawnImpl,
  });
  assert.equal(fake.calls.length, 0);
  assert.match(result.error, /session model/);
});

test("an undocumented thinking level fails closed", () => {
  const read = readSessionModel({
    model: { provider: "openai", id: "example-model", headers: { authorization: "secret" } },
    thinkingLevel: "ultra",
  });
  assert.equal(read.ok, false);
  const kept = readSessionModel({
    model: { provider: "openai", id: "example-model", headers: { authorization: "secret" } },
    thinkingLevel: "high",
  });
  assert.equal(kept.ok, true);
  if (kept.ok) {
    assert.equal(kept.model.provider, "openai");
    assert.equal(kept.model.id, "example-model");
    assert.equal("headers" in kept.model, false);
  }
});
