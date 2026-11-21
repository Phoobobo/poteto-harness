import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { readJson, validateCodexMarketplace, validatePluginManifest } from "../src/validate.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("root plugin.json matches the Agent Plugins schema", async () => {
  const schema = await readJson(path.join(root, "schema", "agent-plugin-1.0.0.schema.json"));
  const manifest = await readJson(path.join(root, "plugin.json"));
  assert.deepEqual(validatePluginManifest(manifest, schema), []);
  assert.equal(manifest.name, "poteto-harness");
  assert.equal(manifest.version, "0.15.44");
});

test("marketplace path is the repository root", async () => {
  const doc = await readJson(path.join(root, ".agents", "plugins", "marketplace.json"));
  assert.deepEqual(validateCodexMarketplace(doc), []);
  const pluginDir = path.resolve(root, doc.plugins[0].source.path);
  assert.equal(path.resolve(pluginDir), root);
  await access(path.join(pluginDir, "plugin.json"));
  await access(path.join(pluginDir, "skills", "poteto-mode", "SKILL.md"));
});

test("explicit skill policy and principle text", async () => {
  const yaml = await readFile(path.join(root, "skills", "tdd", "agents", "openai.yaml"), "utf8");
  assert.match(yaml, /allow_implicit_invocation: false/);
  const skill = await readFile(path.join(root, "skills", "principle-fix-root-causes", "SKILL.md"), "utf8");
  assert.equal(skill.includes("poteto-harness"), false);
});

test("release tree has no trae or grok host", async () => {
  const names = await readdir(root);
  assert.equal(names.includes("hosts"), false);
  const text = await readFile(path.join(root, "README.md"), "utf8");
  assert.match(text, /codex plugin marketplace add Phoobobo\/poteto-harness/);
  assert.match(text, /https:\/\/github.com\/Phoobobo\/poteto-harness\.git/);
  assert.equal(text.includes("traecli"), false);
  assert.equal(text.includes("grok plugin"), false);
});

test("pi package points at skills and the delegate tool", async () => {
  const pkg = await readJson(path.join(root, "package.json"));
  assert.equal(pkg.name, "poteto-harness");
  assert.equal(pkg.private, undefined);
  assert.deepEqual(pkg.pi.extensions, ["./extensions/index.ts"]);
  assert.deepEqual(pkg.pi.skills, ["./skills"]);
  const extension = await readFile(path.join(root, "extensions", "index.ts"), "utf8");
  assert.match(extension, /name: "pstack_delegate"/);
  assert.match(extension, /ctx\.model/);
});
