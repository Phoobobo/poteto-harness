# Pi coding agent

Pi does not ship a native subagent tool. https://pi.dev states: spawn Pi instances yourself, or build an extension. This package's extension implements that spawn. It is not a native Pi subagent.

The parent calls the extension tool `pstack_delegate`. The extension starts one `pi --mode json -p --no-session` process per task, with `--no-extensions`, `--no-skills`, `--append-system-prompt` set to the role file, and `--tools` taken from that role.

Omitting `--model` does not inherit the parent session's selection. The child would use Pi's configured default, which can differ. The extension reads `ctx.model.provider` and `ctx.model.id` from the tool context (`ExtensionContext.model` in `@earendil-works/pi-coding-agent` 1.6.0) and passes `--model <provider>/<id>`. If `ctx.thinkingLevel` is one of the documented `--thinking` values, it passes that too. If the session model is missing or the thinking level is not one of those values, the tool spawns nothing.

Each child gets its own working directory. That directory is not a security sandbox: Pi tools can still read absolute paths, including the parent repo. Parallel tasks are capped at 8, with 4 running at once.

The extension reads the JSONL stream until the process closes. A child is accepted only when the process exits 0, an `agent_settled` record has `aborted: false`, and `result.json` in that directory matches the schema. The extension does not write `result.json`. The check does not prove a hostile parent could not write the same file; it proves this tool did not substitute a parent-authored file for a missing child file.

Cancellation sends SIGTERM, then SIGKILL after 5 seconds, and marks the child aborted. A per-call `timeoutMs` is an extension deadline, not a Pi flag. A failed sibling is still collected; it does not erase the others.

Cursor-only fields in the upstream steps (`Task`, `subagent_type`, `generalPurpose`, `poteto-agent`, `comment-sicko`, `environment`, `readonly`, `run_in_background`, Cursor model slugs, `/loop`, Custom Mode, `AskQuestion`, `pstack-models.mdc`) are not sent unless the user explicitly says to use Cursor.

The child writes `result.json` in the directory this prompt names. That file is an object with `findings` (array) and `commands` (array of objects with `argv` array and numeric `exitCode`). After the native tool returns, the parent runs `node runtime/inspect.mjs --dir <output> --acceptance <schema>`. inspect checks those types and records a sha256 of the file bytes. It does not read a child status line.
