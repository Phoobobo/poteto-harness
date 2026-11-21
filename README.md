# poteto-harness

Codex plugin and Pi package for pstack **0.15.44** (`e58dd043600587dbaf58ba315e7f2b38373eeb43`). The skill text is upstream. This repository root is the Codex plugin. The same root is the npm package for Pi.

`pstack_delegate` is the Pi tool name from the verified baseline. Pi has no native subagent. The tool spawns `pi --mode json` and passes `--model <provider>/<id>` from `ExtensionContext.model`.

## Codex

Documented install, https://developers.openai.com/plugins/build/plugins (fetched 2026-11-21). These commands add this public repository as a marketplace. Codex reads `.agents/plugins/marketplace.json`. Its `source.path` is `./`, resolved from the repository root, which contains `plugin.json` and `skills/`. Do not add `--sparse .agents/plugins`: that checkout omits the plugin root.

```bash
codex plugin marketplace add Phoobobo/poteto-harness
codex plugin marketplace add Phoobobo/poteto-harness --ref main
codex plugin marketplace add https://github.com/Phoobobo/poteto-harness.git
```

A local checkout uses the repository root as the marketplace root:

```bash
codex plugin marketplace add /absolute/path/to/poteto-harness
```

These commands were not run here. This machine has no Codex binary, and https://github.com/Phoobobo/poteto-harness returned 404 while this commit was prepared. For a trusted project whose marketplace is this repo, the documented enable key is:

```toml
[plugins."poteto-harness@poteto-harness"]
enabled = true
```

Copy `codex-agents/*.toml` into that disposable home's `agents/` or into a repo `.codex/agents/`. The TOML files do not set `model`. In the session, omit `model` on `spawn_agent` so the child inherits that session. This is Codex session inheritance, not the Pi child process.

Explicit skills ship `agents/openai.yaml` with `allow_implicit_invocation: false`.

Verified baseline, not this export: Codex 0.162.1 and 0.171.0 spawned `pstack_worker` and `wait_agent` saw an independent session, against commit `9e66a16`.

## Pi

```bash
PI_CODING_AGENT_DIR="$PWD/.pi-agent" pi -e /absolute/path/to/this/repo
```

`PI_CODING_AGENT_DIR` keeps that load off `~/.pi`. Project install, only in a repo you can discard:

```bash
pi install -l /absolute/path/to/this/repo
```

`npm view poteto-harness` returned 404 on 2026-11-21, including `poteto-harness@0.15.44`. The unscoped name stays `poteto-harness`. Nothing has been published.

Typecheck used `@earendil-works/pi-coding-agent` 1.6.0. Verified baseline, not this export: Pi 1.6.0 on a Mac, parent pid 89726 and child pid 91224, both `openai-codex/gpt-6.2-sol` with thinking medium, `nativeSubagent` false, installed from `~/.local/share/pstack-harness-pi/0.15.44-9e66a16/package`.

The child directory is not a sandbox. `result.json` is the acceptance file. This package does not write it for the child. A parent that can write the same path can still forge it.

## Checks

```bash
npm ci
npm test
npm run typecheck
```

Node `>=22.14.0` matches the npm trusted-publisher requirement. These tests do not start Codex or Pi.

## npm release

`package.json` `repository.url` is `git+https://github.com/Phoobobo/poteto-harness.git`. `.github/workflows/publish.yml` runs only when a person publishes a GitHub Release. A tag push does not publish. The workflow checks that the release tag is `v` plus `package.json` `version`, then runs `scripts/publish-if-absent.mjs`. If `poteto-harness@<version>` is already on the registry, that script exits without `npm publish`. A second run of the same release therefore does not publish again. No npm token is stored in this repo, and this tree does not create a tag or a release.

Trusted publishing, https://docs.npmjs.com/trusted-publishers (fetched 2026-11-21): npm CLI `>=11.5.1`, Node `>=22.14.0`, GitHub-hosted runner, workflow permission `id-token: write`. On npmjs.com, for package `poteto-harness`, add a GitHub Actions trusted publisher with user `Phoobobo`, repository `poteto-harness`, and workflow filename `publish.yml`. Configurations created after 2026-09-03 allow `npm stage publish` by default, so this publisher must also be allowed to run `npm publish`. The filename must match exactly. `repository.url` must match this repository. The first successful publish has to happen within 2 days of creating that publisher or the configuration expires. Provenance is automatic for a public package published from this public repository. The package is not on the registry yet, so that settings page cannot be saved from here.
