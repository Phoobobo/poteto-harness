# Verification

Checked 2026-11-21 on the release branch after setting `repository.url` to `git+https://github.com/Phoobobo/poteto-harness.git`. These commands do not start Codex or Pi, and they do not publish.

```bash
npm ci
npm test
npm run typecheck
RELEASE_TAG=v0.15.44 GITHUB_REF= node scripts/check-release-version.mjs
node scripts/publish-if-absent.mjs --check
npm view poteto-harness version
npm view poteto-harness@0.15.44 version
```

`npm ci` installed 125 packages. `npm test` was 27 pass, 0 fail. `npm run typecheck` completed with no diagnostics. The version checker printed `version 0.15.44 matches git+https://github.com/Phoobobo/poteto-harness.git`. `--check` printed `poteto-harness@0.15.44 is not on the registry; publish would run` and did not run `npm publish`. Both `npm view` commands returned registry 404. `test/pack.test.mjs` ran `npm pack --dry-run --json` and required `skills/poteto-mode/SKILL.md`, `extensions/index.ts`, `extensions/spawn.ts`, and the role files. It rejected `node_modules`, Trae, grok, `.github`, and `.env` paths.

https://github.com/Phoobobo/poteto-harness returned HTTP 404 during this check. No Codex or Pi binary was used. This renamed tree was not run as a live Codex or Pi session.

## Trusted publishing runtime, 2026-11-21

The initial CI run https://github.com/Phoobobo/poteto-harness/actions/runs/44906531359 used `actions/setup-node@v4` with `node-version: 22` and logged `node: v22.23.5` and `npm: 10.9.9`. https://nodejs.org/dist/index.json on this date lists that pair, lists no Node 22 release with npm `>=11.5.1`, and lists `v24.22.3` with npm `11.19.1`. The official linux-x64 tarball `node-v24.22.3-linux-x64.tar.xz` matched `SHASUMS256.txt`. Running that tarball printed `v24.22.3` and `11.19.1`. `npm view npm version` was `12.2.3`, so the workflow does not run `npm install -g npm@latest`.

`node scripts/check-publish-runtime.mjs` with Node `v22.23.4` and its bundled npm printed `publish-runtime node=v22.23.4 npm=10.9.9 bundled-npm=10.9.9` and exited 1. The same script with the Node `v24.22.3` tarball printed `publish-runtime node=v24.22.3 npm=11.19.1 bundled-npm=11.19.1` and exited 0. That second runtime then ran `npm ci` (125 packages), `npm test` (32 pass, 0 fail), `npm run typecheck`, `npm run pack:check`, `RELEASE_TAG=v0.15.44 node scripts/check-release-version.mjs`, and `node scripts/publish-if-absent.mjs --check`. The version check printed `version 0.15.44 matches git+https://github.com/Phoobobo/poteto-harness.git`. `--check` printed `poteto-harness@0.15.44 is not on the registry; publish would run` and did not run `npm publish`. `npm view poteto-harness` and `npm view poteto-harness@0.15.44` returned registry 404. No npm login was used, and no trusted publisher was read or written. This check did not start Codex or Pi. The Node 24 commands are the official tarball, not yet the GitHub-hosted `setup-node` resolution; the workflow check records that resolution when CI runs.

Baseline that this export does not repeat:

- Codex 0.162.1 and 0.171.0, `pstack_worker` spawn and wait, independent session, commit `9e66a16`.
- Pi 1.6.0, parent pid 89726, child pid 91224, both `openai-codex/gpt-6.2-sol`, thinking medium, `nativeSubagent` false, path `~/.local/share/pstack-harness-pi/0.15.44-9e66a16/package`.
