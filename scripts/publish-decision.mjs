export function decidePublish(registryVersion, packageVersion) {
  if (registryVersion == null) return "publish";
  if (registryVersion === packageVersion) return "skip";
  throw new Error(`registry version ${registryVersion} does not match ${packageVersion}`);
}
