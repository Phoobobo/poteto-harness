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

`package.json` `engines.node` stays `>=22.14.0`. That is the Node floor from https://docs.npmjs.com/trusted-publishers (fetched 2026-11-21). The same page requires npm CLI `>=11.5.1`. CI and the publish job install Node 24 with `actions/setup-node@v4`, then run `node scripts/check-publish-runtime.mjs` before `npm ci`. The publish job runs that check again immediately before `scripts/publish-if-absent.mjs`. The script prints `process.version` and the `npm --version` on `PATH`, and it also runs the `npm` binary next to that Node. It exits non-zero unless those two npm versions are the same, Node is `>=22.14.0`, and npm is `>=11.5.1`. It takes no arguments and does not read a skip variable. These tests do not start Codex or Pi, and they do not publish.

Node 22 does not meet the npm floor. https://nodejs.org/dist/index.json on 2026-11-21 lists every Node 22 release with npm 10, including `v22.23.5` with npm `10.9.9`, and lists `v24.22.3` with npm `11.19.1`. The first Node 24 build at or above npm `11.5.1` is `v24.5.0`. The initial CI run used the Node 22 line: https://github.com/Phoobobo/poteto-harness/actions/runs/44906531359 logged `node: v22.23.5` and `npm: 10.9.9`.

## npm release

`package.json` `repository.url` is `git+https://github.com/Phoobobo/poteto-harness.git`. `.github/workflows/publish.yml` runs only when a person publishes a GitHub Release. A tag push does not publish. The workflow checks that the release tag is `v` plus `package.json` `version`, then runs `scripts/publish-if-absent.mjs`. If `poteto-harness@<version>` is already on the registry, that script exits without `npm publish`. A second run of the same release therefore does not publish again. No npm token is stored in this repo, and this tree does not create a tag, a release, or an npm publisher.

The publish job runs on `ubuntu-latest` (GitHub-hosted runners; self-hosted runners are not supported). Its permissions are `id-token: write` and `contents: read`. `actions/setup-node@v4` sets `registry-url` to `https://registry.npmjs.org` and `package-manager-cache: false`. Provenance is automatic for a public package published from this public repository. Do not set `provenance` to false.

Trusted publisher settings are on the npm account, and this repository cannot see them. Nothing here logged in to npm. On 2026-11-21, `npm view poteto-harness` and `npm view poteto-harness@0.15.44` both returned registry 404. While the package is absent, the package settings page described by https://docs.npmjs.com/trusted-publishers cannot be saved. https://github.blog/changelog/2026-10-02-npm-staged-publishing-now-supports-creating-new-packages says a maintainer can create the package with `npm stage publish` from a local session or a granular access token, then configure trusted publishing. https://docs.npmjs.com/cli/v11/commands/npm-stage/ says a staged version occupies that version, so it cannot also be published. This workflow does not run `npm stage publish`.

Once the package exists, add one GitHub Actions trusted publisher:

- Organization or user: `Phoobobo`
- Repository: `poteto-harness`
- Workflow filename: `publish.yml` (the filename only, including `.yml`)
- Environment name: leave empty. This workflow does not set a GitHub environment.
- Allowed actions: enable direct `npm publish`. A publisher created after 2026-09-03 allows `npm stage publish` until direct publish is selected. `scripts/publish-if-absent.mjs` runs `npm publish` only when that exact version is absent. This workflow does not run `npm dist-tag`.

`repository.url` must stay `git+https://github.com/Phoobobo/poteto-harness.git`. The workflow filename on npm must stay `publish.yml`. A new publisher expires unless a successful publish from it completes within 2 days. The skip path, when the version is already on the registry, does not publish and does not satisfy that requirement. Do not publish or stage the release version before that release, or this workflow will not be the publish that validates the publisher. Creating the package and the publisher is an account action. This tree does not do it.
