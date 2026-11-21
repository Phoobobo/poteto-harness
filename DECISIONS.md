# Decisions

## Release tree

This orphan branch is the GitHub import source. `main` still has the Trae and grok work and is not rewritten. https://github.com/Phoobobo/poteto-harness is the public target. It returned HTTP 404 while this commit was prepared, so this commit was not pushed there.

The repository root is the Codex plugin: `plugin.json` plus `skills/`, and `.agents/plugins/marketplace.json` with `source.path` `./`. That matches https://developers.openai.com/plugins/build/plugins (fetched 2026-11-21). `codex plugin marketplace add Phoobobo/poteto-harness` and `codex plugin marketplace add https://github.com/Phoobobo/poteto-harness.git` are the documented GitHub-source commands. `--sparse .agents/plugins` is not used, because that checkout would omit `plugin.json` and `skills/` at the repository root.

Pi uses the same root. `package.json` `pi.extensions` and `pi.skills` follow https://docs.pi.dev/latest/packages. The npm name is the unscoped `poteto-harness`. On 2026-11-21 `npm view poteto-harness` and `npm view poteto-harness@0.15.44` returned 404. The name is unchanged. `@poteto` is not used.

`repository.url` is `git+https://github.com/Phoobobo/poteto-harness.git`. Version `0.15.44` matches the upstream skill version. It is not a claim that this tree was the Mac install at `9e66a16`.

## License

Upstream pstack is MIT, copyright 2026 Lauren Tan, https://github.com/cursor/plugins commit `e58dd043600587dbaf58ba315e7f2b38373eeb43`. MIT allows redistribution with the notice kept. `LICENSE` is that text. `NOTICE.md` records the source. `plugin.json` `homepage` stays on that upstream tree.

## npm

Publish is `.github/workflows/publish.yml`. The only trigger is a published GitHub Release. A tag push runs CI only. Creating a release from a tag used to start both the tag workflow and the release workflow; the tag trigger was removed so that pair cannot publish twice. `scripts/publish-if-absent.mjs` queries the registry and skips `npm publish` when `poteto-harness@<version>` is already present, so a re-run of the same release does not publish again. The human gate is publishing the GitHub Release. This tree does not create that release or its tag.

https://docs.npmjs.com/trusted-publishers (fetched 2026-11-21) requires npm CLI `>=11.5.1`, Node `>=22.14.0`, a GitHub-hosted runner, and `id-token: write`. Account settings, once the package exists: GitHub Actions, user `Phoobobo`, repository `poteto-harness`, workflow filename `publish.yml`, and direct `npm publish` allowed. Configurations created after 2026-09-03 do not allow `npm publish` until that action is selected. `repository.url` must match exactly. The first successful publish must happen within 2 days of creating the publisher. Provenance is automatic for this public repository and public package. No `NPM_TOKEN` is stored here.

## Model

Codex session inheritance is omitting `model` on `spawn_agent`. Pi does not work that way. `pstack_delegate` passes `--model <provider>/<id>` from `ExtensionContext.model`.

## Not in this tree

Trae, grok, machine logs, `node_modules`, and the old host directories.

## Remaining push

After https://github.com/Phoobobo/poteto-harness exists, is empty, and is public, push this orphan history as the initial commit. Do not push `main`. Do not create a release tag during that push.
