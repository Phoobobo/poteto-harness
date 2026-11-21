import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function typeErrors(value, spec, where) {
  if (!spec || typeof spec !== "object") return [`${where} has no schema`];
  if (spec.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return [`${where} is not an object`];
    }
    const reasons = [];
    for (const key of spec.required ?? []) {
      if (!Object.hasOwn(value, key)) reasons.push(`${where}.${key} is missing`);
    }
    for (const [key, child] of Object.entries(spec.properties ?? {})) {
      if (Object.hasOwn(value, key)) reasons.push(...typeErrors(value[key], child, `${where}.${key}`));
    }
    return reasons;
  }
  if (spec.type === "array") {
    if (!Array.isArray(value)) return [`${where} is not an array`];
    if (!spec.items) return [];
    return value.flatMap((item, index) => typeErrors(item, spec.items, `${where}[${index}]`));
  }
  if (spec.type === "string" && typeof value !== "string") return [`${where} is not a string`];
  if (spec.type === "number" && typeof value !== "number") return [`${where} is not a number`];
  if (spec.type === "boolean" && typeof value !== "boolean") return [`${where} is not a boolean`];
  return [];
}

export async function inspectDirectory(dir, acceptance) {
  const reasons = [];
  const digests = {};
  for (const check of acceptance ?? []) {
    if (check.kind !== "jsonDocument") {
      reasons.push(`unsupported acceptance kind ${check.kind}`);
      continue;
    }
    const file = path.join(dir, check.path);
    let body;
    try {
      body = await readFile(file);
    } catch (error) {
      if (error.code === "ENOENT") {
        reasons.push(`missing ${check.path}`);
        continue;
      }
      throw error;
    }
    digests[check.path] = createHash("sha256").update(body).digest("hex");
    let parsed;
    try {
      parsed = JSON.parse(body.toString("utf8"));
    } catch {
      reasons.push(`${check.path} is not JSON`);
      continue;
    }
    reasons.push(...typeErrors(parsed, check.schema, check.path));
  }
  return {
    accepted: reasons.length === 0,
    reasons,
    digests,
    childClaimRead: false,
    nativeChildInvoked: false,
  };
}

function arg(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

export async function main(argv) {
  const dir = arg(argv, "--dir");
  const acceptance = arg(argv, "--acceptance");
  if (!dir || !acceptance) {
    process.stderr.write("usage: inspect.mjs --dir <output> --acceptance <json>\n");
    return 1;
  }
  const result = await inspectDirectory(dir, JSON.parse(acceptance));
  const out = arg(argv, "--out");
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (out) await writeFile(out, text);
  process.stdout.write(text);
  return result.accepted ? 0 : 2;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invoked) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`${error.stack || error.message}\n`);
      process.exitCode = 1;
    },
  );
}
