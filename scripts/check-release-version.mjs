import { readFile } from "node:fs/promises";

const EXPECTED_URL = "git+https://github.com/Phoobobo/poteto-harness.git";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const ref = process.env.GITHUB_REF ?? "";
const tag = ref.startsWith("refs/tags/v") ? ref.slice("refs/tags/v".length) : "";
const releaseTag = (process.env.RELEASE_TAG ?? "").replace(/^v/, "");
const expected = releaseTag || tag;
if (!expected) {
  process.stderr.write("no v* tag on GITHUB_REF or RELEASE_TAG\n");
  process.exit(1);
}
if (pkg.version !== expected) {
  process.stderr.write(`package.json version ${pkg.version} does not match tag ${expected}\n`);
  process.exit(1);
}
const url = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url ?? "";
if (url !== EXPECTED_URL) {
  process.stderr.write(`repository.url must be ${EXPECTED_URL}\n`);
  process.exit(1);
}
process.stdout.write(`version ${pkg.version} matches ${url}\n`);
