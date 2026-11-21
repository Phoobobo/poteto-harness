const READ_TOOLS = ["read", "grep", "find", "ls"];
const WRITE_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls"];

export const PI_ROLES = [
  {
    file: "pstack-explorer.md",
    name: "pstack-explorer",
    tools: READ_TOOLS,
    description: "Read-only pstack explorer. Write result.json only in the child directory.",
  },
  {
    file: "pstack-poteto.md",
    name: "pstack-poteto",
    tools: WRITE_TOOLS,
    description: "pstack poteto-mode delegate. Write only in the child directory.",
  },
  {
    file: "pstack-worker.md",
    name: "pstack-worker",
    tools: WRITE_TOOLS,
    description: "pstack implementation delegate. Write only in the child directory.",
  },
  {
    file: "pstack-comment-sicko.md",
    name: "pstack-comment-sicko",
    tools: READ_TOOLS,
    description: "pstack comment reviewer. Do not edit application code. Write result.json in the child directory.",
  },
];

export function roleMarkdown(role) {
  return [
    "---",
    `name: ${role.name}`,
    `description: ${role.description}`,
    `tools: ${role.tools.join(", ")}`,
    "---",
    "",
    role.description,
    "Pi has no native subagent. You are a separate `pi --mode json` process.",
    "Write result.json in the working directory before you finish.",
    "",
  ].join("\n");
}
