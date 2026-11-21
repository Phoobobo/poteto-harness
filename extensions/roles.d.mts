export const PI_ROLES: readonly {
  file: string;
  name: string;
  tools: readonly string[];
  description: string;
}[];

export function roleMarkdown(role: {
  file: string;
  name: string;
  tools: readonly string[];
  description: string;
}): string;
