import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { decidePublish } from "./publish-decision.mjs";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const checkOnly = process.argv.includes("--check");

function registryVersion(name, version) {
  const result = spawnSync("npm", ["view", `${name}@${version}`, "version", "--json"], {
    encoding: "utf8",
  });
  if (result.status === 0) {
    const parsed = JSON.parse(result.stdout);
    return typeof parsed === "string" ? parsed : null;
  }
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (text.includes("E404") || text.includes("404")) return null;
  process.stderr.write(text);
  process.exit(result.status || 1);
}

const existing = registryVersion(pkg.name, pkg.version);
const decision = decidePublish(existing, pkg.version);
if (decision === "skip") {
  process.stdout.write(`${pkg.name}@${pkg.version} is already on the registry; skip npm publish\n`);
  process.exit(0);
}
if (checkOnly) {
  process.stdout.write(`${pkg.name}@${pkg.version} is not on the registry; publish would run\n`);
  process.exit(0);
}
const published = spawnSync("npm", ["publish", "--access", "public"], { stdio: "inherit" });
process.exit(published.status ?? 1);
