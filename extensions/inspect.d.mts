export function inspectDirectory(
  dir: string,
  acceptance: readonly { kind: string; path: string; schema: unknown }[],
): Promise<{ accepted: boolean; reasons: string[] }>;
