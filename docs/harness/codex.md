# Codex CLI 0.170

This file is instructions for the parent Codex session. It is not an outer spawn command.

`codex exec` starts that parent session. It is not proof a child ran.

Dispatch with the in-session tool `spawn_agent`. Omit `model` and `reasoning_effort` so the child inherits the parent. Do not send a model id unless the user names one this session has already shown as entitled.

Use `agent_type` `pstack_explorer` for read-only work and `pstack_poteto`, `pstack_worker`, or `pstack_comment_sicko` for the matching role. Those names are the TOML files under `codex-agents/`. Copy them into this repo's `.codex/agents/` or into `$CODEX_HOME/agents` for a disposable home. Do not copy them into the user's `~/.codex/agents`.

Pass `fork_turns` `none` so the child does not inherit the parent transcript. `spawn_agent` has no worktree field. `--worktree` on `codex exec` isolates the parent session only.

Wait with the session tool `wait_agent` for that spawn. On the v2 tool the wait summary may not include the child's final text, so the parent still reads `result.json`.

Cursor-only fields in the upstream steps (`Task`, `subagent_type`, `generalPurpose`, `poteto-agent`, `comment-sicko`, `environment`, `readonly`, `run_in_background`, Cursor model slugs, `/loop`, Custom Mode, `AskQuestion`, `pstack-models.mdc`) are not sent unless the user explicitly says to use Cursor.

The child writes `result.json` in the directory this prompt names. That file is an object with `findings` (array) and `commands` (array of objects with `argv` array and numeric `exitCode`). After the native tool returns, the parent runs `node runtime/inspect.mjs --dir <output> --acceptance <schema>`. inspect checks those types and records a sha256 of the file bytes. It does not read a child status line.

A live 0.170 session has not been captured here, so this file does not name a JSONL event type. A later log either contains the literal `spawn_agent` or it does not.
