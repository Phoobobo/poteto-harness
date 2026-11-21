---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
---

> **poteto-harness.** In Codex, read `../../docs/harness/codex.md` and call `spawn_agent`, then `wait_agent`. In Pi, call `pstack_delegate`. Pi has no native subagent; that tool spawns `pi --mode json` and passes `--model <provider>/<id>` from the parent session. Cursor-only fields below are not sent unless the user explicitly says to use Cursor. The parent accepts `result.json` with `node ../../runtime/inspect.mjs`. Pi harness: `../../docs/harness/pi.md`.

# How

Explore the codebase to answer "how does X work?" questions.

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

## 1. Explain

Spawn one Task subagent with `subagent_type: generalPurpose` and `readonly: true` that explores and explains in one pass. Give it the user's question and this brief:

> You are writing an architectural explanation for a senior engineer. Explore the codebase and write an explanation that a senior engineer unfamiliar with this area could read and walk away with a solid mental model. They should understand the architecture well enough to start working in it confidently. You have read-only access to the codebase.

## 2. Present

Present the subagent's output. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.
