const rawBasePath = import.meta.env.BASE_URL || "/";

function normalizeBasePath(path: string) {
  if (!path || path === "/") {
    return "";
  }

  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}

export const appBasePath = normalizeBasePath(rawBasePath);

export function withBasePath(path: string) {
  if (!appBasePath) {
    return path;
  }

  if (!path.startsWith("/")) {
    return `${appBasePath}/${path}`;
  }

  return `${appBasePath}${path}`;
}

export function apiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return withBasePath(
    normalizedPath.startsWith("/api/")
      ? normalizedPath
      : `/api${normalizedPath}`,
  );
}
