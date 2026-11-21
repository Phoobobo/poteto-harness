export const MIN_NODE = [22, 14, 0];
export const MIN_NPM = [11, 5, 1];

export function parseSemver(text) {
  const match = String(text).trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function versionAtLeast(actual, minimum) {
  if (!actual || actual.length !== 3) return false;
  for (let i = 0; i < 3; i += 1) {
    if (actual[i] > minimum[i]) return true;
    if (actual[i] < minimum[i]) return false;
  }
  return true;
}
