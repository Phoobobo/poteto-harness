import { readFile } from "node:fs/promises";

export function validatePluginManifest(manifest, schema) {
  const errors = [];
  const allowed = new Set(Object.keys(schema.properties));
  for (const key of Object.keys(manifest)) {
    if (!allowed.has(key)) errors.push(`additional property ${key}`);
  }
  for (const key of schema.required) {
    if (!(key in manifest)) errors.push(`missing ${key}`);
  }
  if (manifest.$schema !== schema.properties.$schema.const) {
    errors.push("$schema const mismatch");
  }
  const name = manifest.name ?? "";
  const pattern = new RegExp(schema.properties.name.pattern);
  if (typeof name !== "string" || !pattern.test(name)) errors.push(`name does not match ${schema.properties.name.pattern}`);
  if ("version" in manifest && typeof manifest.version !== "string") errors.push("version must be a string");
  if ("description" in manifest && typeof manifest.description !== "string") errors.push("description must be a string");
  if ("keywords" in manifest) {
    if (!Array.isArray(manifest.keywords) || manifest.keywords.some((item) => typeof item !== "string")) {
      errors.push("keywords must be an array of strings");
    }
  }
  if ("author" in manifest) {
    const author = manifest.author;
    if (!author || typeof author !== "object" || Array.isArray(author)) errors.push("author must be an object");
    else {
      for (const key of Object.keys(author)) {
        if (!["name", "email", "url"].includes(key)) errors.push(`author.${key} is not allowed`);
      }
    }
  }
  if ("extensions" in manifest) {
    const extensions = manifest.extensions;
    if (!extensions || typeof extensions !== "object" || Array.isArray(extensions)) {
      errors.push("extensions must be an object");
    } else {
      for (const [namespace, value] of Object.entries(extensions)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          errors.push(`extensions.${namespace} must be an object`);
        }
      }
    }
  }
  return errors;
}

/**
 * Fields required by the Codex marketplace example on
 * https://developers.openai.com/plugins/build/plugins (fetched 2026-11-19).
 * This is not an official JSON Schema. Codex does not publish one on that page.
 */
export function validateCodexMarketplace(doc) {
  const errors = [];
  if (typeof doc.name !== "string" || !doc.name) errors.push("marketplace name");
  if (!doc.interface || typeof doc.interface.displayName !== "string") {
    errors.push("interface.displayName");
  }
  if (!Array.isArray(doc.plugins) || doc.plugins.length === 0) errors.push("plugins");
  for (const [index, plugin] of (doc.plugins ?? []).entries()) {
    if (typeof plugin.name !== "string") errors.push(`plugins[${index}].name`);
    const source = plugin.source;
    const sourcePath = typeof source === "string" ? source : source?.path;
    if (typeof sourcePath !== "string" || !sourcePath.startsWith("./")) {
      errors.push(`plugins[${index}].source.path must start with ./`);
    }
    if (source && typeof source === "object" && source.source !== "local") {
      errors.push(`plugins[${index}].source.source`);
    }
    const installation = plugin.policy?.installation;
    if (!["AVAILABLE", "INSTALLED_BY_DEFAULT", "NOT_AVAILABLE"].includes(installation)) {
      errors.push(`plugins[${index}].policy.installation`);
    }
    if (typeof plugin.policy?.authentication !== "string") {
      errors.push(`plugins[${index}].policy.authentication`);
    }
    if (typeof plugin.category !== "string") errors.push(`plugins[${index}].category`);
  }
  return errors;
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
