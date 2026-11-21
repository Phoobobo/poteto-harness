import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { delegate, readSessionModel, realSpawner, type TaskInput } from "./spawn.ts";

const rolesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../roles");

function isTask(value: unknown): value is TaskInput {
  if (typeof value !== "object" || value === null) return false;
  if (!("role" in value) || !("task" in value)) return false;
  return typeof value.role === "string" && typeof value.task === "string";
}

function isTaskList(value: unknown): value is TaskInput[] {
  return Array.isArray(value) && value.every(isTask);
}

export default function pstackPiExtension(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "pstack_delegate",
    label: "pstack delegate",
    description:
      "Spawn isolated pi --mode json children for pstack roles. Pi has no native subagent; this tool is the extension implementation. It does not write result.json itself.",
    promptSnippet: "Delegate a pstack role to a separate pi --mode json process.",
    promptGuidelines: [
      "Use pstack_delegate when a pstack skill needs a child. Do not do that child's writes in the parent.",
    ],
    parameters: Type.Object({
      tasks: Type.Array(
        Type.Object({
          role: Type.String(),
          task: Type.String(),
        }),
        { minItems: 1, maxItems: 8 },
      ),
      timeoutMs: Type.Optional(Type.Integer({ minimum: 1000, maximum: 600_000 })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      if (!isTaskList(params.tasks)) {
        return {
          content: [{ type: "text", text: "pstack_delegate rejected the task list." }],
          details: { implementedBy: "extension", nativeSubagent: false },
        };
      }
      const session = readSessionModel({ model: ctx.model, thinkingLevel: ctx.thinkingLevel });
      if (!session.ok) {
        return {
          content: [{ type: "text", text: session.error }],
          details: { implementedBy: "extension", nativeSubagent: false, error: session.error },
        };
      }
      const timeoutMs = typeof params.timeoutMs === "number" ? params.timeoutMs : 120_000;
      const result = await delegate({
        tasks: params.tasks,
        repo: ctx.cwd,
        rolesDir,
        piCommand: process.env.PSTACK_PI_BIN ?? "pi",
        timeoutMs,
        sessionModel: session.model,
        signal,
        spawnImpl: ({ command, args, cwd }) => realSpawner(command, args, cwd),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        details: { implementedBy: "extension", nativeSubagent: false, ...result },
      };
    },
  });
}
