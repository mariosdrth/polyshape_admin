/**
 * Returns the last segment of a pathname, decoded if possible.
 * Example: "/foo/bar/test.json" → "test.json"
 */
export function lastPathSegment(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  const raw = idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
