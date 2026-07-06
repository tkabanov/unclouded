export interface DecomposedUrl {
  serverUrl: string;
  path: string;
  pathParams: string[];
  queryParams: Array<{ name: string; templated: boolean; value: string | null }>;
}

const TEMPLATE_PATTERN = /^\[[^\]]+\]$/;

export function decomposeUrlTemplate(rawUrl: string): DecomposedUrl {
  const parsed = new URL(rawUrl);
  const pathSegments = parsed.pathname.split("/").filter((segment) => segment.length > 0);
  const pathParams: string[] = [];
  const normalizedPathSegments = pathSegments.map((segment) => {
    if (TEMPLATE_PATTERN.test(segment)) {
      const name = segment.slice(1, -1);
      pathParams.push(name);
      return `{${name}}`;
    }
    return segment;
  });
  const queryParams: Array<{ name: string; templated: boolean; value: string | null }> = [];
  for (const [name, value] of parsed.searchParams.entries()) {
    const templated = TEMPLATE_PATTERN.test(value);
    queryParams.push({
      name,
      templated,
      value: templated ? null : value,
    });
  }
  return {
    serverUrl: `${parsed.protocol}//${parsed.host}`,
    path: `/${normalizedPathSegments.join("/")}`,
    pathParams,
    queryParams,
  };
}
