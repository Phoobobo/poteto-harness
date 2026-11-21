import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inspectDirectory } from "./inspect.mjs";
import { PI_ROLES, roleMarkdown } from "./roles.mjs";

const RESULT_SCHEMA = {
  type: "object",
  required: ["findings", "commands"],
  properties: {
    findings: { type: "array" },
    commands: {
      type: "array",
      items: {
        type: "object",
        required: ["argv", "exitCode"],
        properties: {
          argv: { type: "array" },
          exitCode: { type: "number" },
        },
      },
    },
  },
};

export const MAX_TASKS = 8;
export const MAX_CONCURRENCY = 4;
const KILL_GRACE_MS = 5_000;

export type ChildStatus = "completed" | "failed" | "aborted" | "timed_out";

export type TaskInput = {
  role: string;
  task: string;
};

export type RoleFile = {
  name: string;
  description: string;
  tools: readonly string[];
  filePath: string;
};

export type ChildProcessLike = {
  stdout: AsyncIterable<Uint8Array | string>;
  stderr: AsyncIterable<Uint8Array | string>;
  kill(signal: NodeJS.Signals): boolean;
  closed: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
};

export type Spawner = (input: {
  command: string;
  args: readonly string[];
  cwd: string;
}) => ChildProcessLike;

export type ChildResult = {
  role: string;
  outputDir: string;
  status: ChildStatus;
  exitCode: number | null;
  settledAborted: boolean | null;
  inspectionAccepted: boolean;
  error: string | null;
};

export type SessionModel = {
  provider: string;
  id: string;
  thinking?: string;
};

const THINKING_LEVELS = new Set(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);

export type DelegateInput = {
  tasks: readonly TaskInput[];
  repo: string;
  rolesDir: string;
  piCommand: string;
  timeoutMs: number;
  sessionModel: SessionModel;
  signal?: AbortSignal;
  spawnImpl: Spawner;
  tempRoot?: string;
};

export { PI_ROLES, roleMarkdown } from "./roles.mjs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRoleFile(filePath: string, text: string): RoleFile | null {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const front = text.slice(4, end);
  const name = /^name:\s*(\S+)\s*$/m.exec(front)?.[1];
  const description = /^description:\s*(.+)\s*$/m.exec(front)?.[1];
  const toolsLine = /^tools:\s*(.+)\s*$/m.exec(front)?.[1];
  if (!name || !description || !toolsLine) return null;
  const tools = toolsLine.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
  if (tools.length === 0) return null;
  return { name, description, tools, filePath };
}

export async function loadRoles(rolesDir: string): Promise<Map<string, RoleFile>> {
  const found = new Map<string, RoleFile>();
  const { readdir } = await import("node:fs/promises");
  let names: string[] = [];
  try {
    names = await readdir(rolesDir);
  } catch {
    return found;
  }
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const filePath = path.resolve(rolesDir, name);
    const root = path.resolve(rolesDir);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) continue;
    const text = await readFile(filePath, "utf8");
    const role = parseRoleFile(filePath, text);
    if (role) found.set(role.name, role);
  }
  return found;
}

export function readSessionModel(input: {
  model?: unknown;
  thinkingLevel?: unknown;
}): { ok: true; model: SessionModel } | { ok: false; error: string } {
  if (!isRecord(input.model)) {
    return {
      ok: false,
      error: "no session model; refusing to spawn because a child default can differ from the parent selection",
    };
  }
  const provider = input.model.provider;
  const id = input.model.id;
  if (typeof provider !== "string" || typeof id !== "string" || provider.length === 0 || id.length === 0) {
    return { ok: false, error: "session model is missing provider or id" };
  }
  if (provider.startsWith("-") || id.startsWith("-") || /\s/.test(provider) || /\s/.test(id)) {
    return { ok: false, error: "session model provider or id is not safe to pass as argv" };
  }
  if (input.thinkingLevel === undefined) return { ok: true, model: { provider, id } };
  if (typeof input.thinkingLevel !== "string" || !THINKING_LEVELS.has(input.thinkingLevel)) {
    return { ok: false, error: "thinking level is not a documented --thinking value" };
  }
  return { ok: true, model: { provider, id, thinking: input.thinkingLevel } };
}

export function childArguments(
  role: RoleFile,
  task: string,
  repo: string,
  outputDir: string,
  sessionModel: SessionModel,
): string[] {
  const prompt = [
    `Task: ${task}`,
    `Parent repo (read with absolute paths): ${repo}`,
    `Working directory for writes: ${outputDir}`,
    "This directory is not a security sandbox.",
    "Write result.json in the working directory.",
    "A status sentence is not acceptance.",
  ].join("\n");
  const args = [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--no-extensions",
    "--no-skills",
    "--model",
    `${sessionModel.provider}/${sessionModel.id}`,
    "--append-system-prompt",
    role.filePath,
    "--tools",
    role.tools.join(","),
  ];
  if (sessionModel.thinking !== undefined) args.push("--thinking", sessionModel.thinking);
  args.push("--", prompt);
  return args;
}

function isAgentSettled(value: unknown): value is { type: "agent_settled"; aborted: boolean } {
  return isRecord(value) && value.type === "agent_settled" && typeof value.aborted === "boolean";
}

async function readLines(
  stream: AsyncIterable<Uint8Array | string>,
  onLine: (line: string) => void,
): Promise<void> {
  let buffer = "";
  for await (const chunk of stream) {
    buffer += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) onLine(line);
  }
  if (buffer.length > 0) onLine(buffer);
}

async function runOne(input: {
  role: RoleFile;
  task: string;
  repo: string;
  piCommand: string;
  timeoutMs: number;
  sessionModel: SessionModel;
  signal: AbortSignal | undefined;
  spawnImpl: Spawner;
  tempRoot: string;
}): Promise<ChildResult> {
  const outputDir = await mkdtemp(path.join(input.tempRoot, "child-"));
  const base: ChildResult = {
    role: input.role.name,
    outputDir,
    status: "failed",
    exitCode: null,
    settledAborted: null,
    inspectionAccepted: false,
    error: null,
  };
  if (input.signal?.aborted) {
    return { ...base, status: "aborted", error: "aborted before start" };
  }
  const args = childArguments(input.role, input.task, input.repo, outputDir, input.sessionModel);
  let child: ChildProcessLike;
  try {
    child = input.spawnImpl({ command: input.piCommand, args, cwd: outputDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : "spawn failed";
    return { ...base, error: message };
  }
  let settledAborted: boolean | null = null;
  const onLine = (line: string) => {
    const trimmed = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (trimmed.length === 0) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return;
    }
    if (isAgentSettled(parsed)) settledAborted = parsed.aborted;
  };
  const stderrChunks: string[] = [];
  const stderrTask = readLines(child.stderr, (line) => {
    stderrChunks.push(line);
  });
  const stdoutTask = readLines(child.stdout, onLine);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, input.timeoutMs);
  const onAbort = () => {
    child.kill("SIGTERM");
  };
  input.signal?.addEventListener("abort", onAbort, { once: true });
  const hardKill = setTimeout(() => {
    if (timedOut || input.signal?.aborted) child.kill("SIGKILL");
  }, input.timeoutMs + KILL_GRACE_MS);
  const closed = await child.closed;
  clearTimeout(timer);
  clearTimeout(hardKill);
  input.signal?.removeEventListener("abort", onAbort);
  await Promise.all([stdoutTask, stderrTask]);
  const inspection = await inspectDirectory(outputDir, [
    { kind: "jsonDocument", path: "result.json", schema: RESULT_SCHEMA },
  ]);
  let status: ChildStatus = "failed";
  let error: string | null = null;
  if (input.signal?.aborted) {
    status = "aborted";
    error = "aborted";
  } else if (timedOut) {
    status = "timed_out";
    error = "extension deadline";
  } else if (closed.code !== 0) {
    status = "failed";
    error = `exit ${closed.code ?? "null"}`;
  } else if (settledAborted === null) {
    status = "failed";
    error = "missing agent_settled";
  } else if (settledAborted) {
    status = "aborted";
    error = "agent_settled aborted";
  } else if (!inspection.accepted) {
    status = "failed";
    error = inspection.reasons.join("; ");
  } else {
    status = "completed";
  }
  return {
    role: input.role.name,
    outputDir,
    status,
    exitCode: closed.code,
    settledAborted,
    inspectionAccepted: inspection.accepted,
    error,
  };
}

export async function delegate(input: DelegateInput): Promise<{ children: ChildResult[]; error: string | null }> {
  if (!input.sessionModel?.provider || !input.sessionModel.id) {
    return { children: [], error: "no session model; refusing to spawn" };
  }
  if (input.tasks.length === 0) return { children: [], error: "no tasks" };
  if (input.tasks.length > MAX_TASKS) return { children: [], error: `too many tasks (${input.tasks.length})` };
  const roles = await loadRoles(input.rolesDir);
  const tempRoot = input.tempRoot ?? (await mkdtemp(path.join(tmpdir(), "pstack-pi-")));
  await mkdir(tempRoot, { recursive: true });
  const queue = input.tasks.map((task, index) => ({ task, index }));
  const children: ChildResult[] = new Array(input.tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, async () => {
    while (cursor < queue.length) {
      const current = cursor;
      cursor += 1;
      const item = queue[current];
      if (!item) return;
      const role = roles.get(item.task.role);
      if (!role) {
        children[item.index] = {
          role: item.task.role,
          outputDir: "",
          status: "failed",
          exitCode: null,
          settledAborted: null,
          inspectionAccepted: false,
          error: `unknown role ${item.task.role}`,
        };
        continue;
      }
      children[item.index] = await runOne({
        role,
        task: item.task.task,
        repo: input.repo,
        piCommand: input.piCommand,
        timeoutMs: input.timeoutMs,
        sessionModel: input.sessionModel,
        signal: input.signal,
        spawnImpl: input.spawnImpl,
        tempRoot,
      });
    }
  });
  await Promise.all(workers);
  return { children, error: null };
}

export function realSpawner(command: string, args: readonly string[], cwd: string): ChildProcessLike {
  const child = spawn(command, [...args], { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  return {
    stdout: child.stdout,
    stderr: child.stderr,
    kill(signal) {
      const ok = child.kill(signal);
      if (signal === "SIGTERM") {
        killTimer = setTimeout(() => {
          child.kill("SIGKILL");
        }, KILL_GRACE_MS);
      }
      return ok;
    },
    closed: new Promise((resolve) => {
      child.on("close", (code, term) => {
        if (killTimer) clearTimeout(killTimer);
        resolve({ code, signal: term });
      });
      child.on("error", () => {
        if (killTimer) clearTimeout(killTimer);
        resolve({ code: null, signal: null });
      });
    }),
  };
}
