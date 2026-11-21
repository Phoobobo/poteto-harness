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

Baseline that this export does not repeat:

- Codex 0.162.1 and 0.171.0, `pstack_worker` spawn and wait, independent session, commit `9e66a16`.
- Pi 1.6.0, parent pid 89726, child pid 91224, both `openai-codex/gpt-6.2-sol`, thinking medium, `nativeSubagent` false, path `~/.local/share/pstack-harness-pi/0.15.44-9e66a16/package`.
