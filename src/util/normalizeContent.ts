/**
 * Normalizes raw content string into an array of paragraphs.
 * Collapses multiple blank lines, trims, and removes empty paragraphs.
 */
export function normalizeContent(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n");
  return normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Joins an array or string of content back into a string
 * suitable for displaying in a textarea.
 */
export function joinContentForEdit(content: unknown): string {
  if (Array.isArray(content)) {
    return content
      .filter((p): p is string => typeof p === "string")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join("\n\n");
  } else if (typeof content === "string") {
    return content;
  }
  return "";
}
