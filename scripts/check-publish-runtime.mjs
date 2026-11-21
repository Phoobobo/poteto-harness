import { spawnSync } from "node:child_process";
import path from "node:path";
import { MIN_NODE, MIN_NPM, parseSemver, versionAtLeast } from "./publish-runtime.mjs";

if (process.argv.length > 2) {
  process.stderr.write("check-publish-runtime.mjs does not accept arguments\n");
  process.exit(1);
}

function npmVersion(executable) {
  const result = spawnSync(executable, ["--version"], { encoding: "utf8" });
  return {
    status: result.status,
    error: result.error ?? null,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

const nodeVersion = process.version;
const bundledNpm = path.join(path.dirname(process.execPath), "npm");
const onPath = npmVersion("npm");
const bundled = npmVersion(bundledNpm);
process.stdout.write(
  `publish-runtime node=${nodeVersion} npm=${onPath.stdout || "missing"} bundled-npm=${bundled.stdout || "missing"}\n`,
);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (onPath.error || onPath.status !== 0) {
  fail(`npm on PATH failed: ${onPath.stderr || onPath.error?.message || onPath.status}`);
}
if (bundled.error || bundled.status !== 0) {
  fail(`npm next to node failed: ${bundled.stderr || bundled.error?.message || bundled.status}`);
}
if (onPath.stdout !== bundled.stdout) {
  fail(`npm on PATH is ${onPath.stdout} but the npm next to node is ${bundled.stdout}`);
}

const nodeOk = versionAtLeast(parseSemver(nodeVersion), MIN_NODE);
const npmOk = versionAtLeast(parseSemver(onPath.stdout), MIN_NPM);
if (!nodeOk || !npmOk) {
  fail(
    `trusted publishing needs node>=${MIN_NODE.join(".")} and npm>=${MIN_NPM.join(".")}; got node ${nodeVersion} npm ${onPath.stdout}`,
  );
}
