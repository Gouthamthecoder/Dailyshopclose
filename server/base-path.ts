function normalizeBasePath(path?: string) {
  if (!path || path === "/") {
    return "";
  }

  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}

export const appBasePath = normalizeBasePath(process.env.APP_BASE_PATH);
