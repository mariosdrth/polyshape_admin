import { API_ROOT } from "../properties";

export type PublicationListItem = {
  url: string;
  pathname: string;
};

export type PublicationDetail = {
  title: string;
  content: string | string[];
  date: string;
  publicationUrl: string;
  authors: string[];
  venue: string;
};

export type EnrichedItem = PublicationListItem & {
  detail?: PublicationDetail;
  error?: string;
};

const API_BASE = `${API_ROOT}/publications`;

const withCacheBuster = (urlStr: string): string => {
  try {
    const u = new URL(urlStr);
    u.searchParams.set("_", Date.now().toString());
    return u.toString();
  } catch {
    const sep = urlStr.includes("?") ? "&" : "?";
    return `${urlStr}${sep}_=${Date.now()}`;
  }
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isAbortError = (e: unknown): e is DOMException =>
  e instanceof DOMException && e.name === "AbortError";

const toListItem = (u: unknown): PublicationListItem | null => {
  if (!isRecord(u)) return null;
  const url = typeof u.url === "string" ? u.url : null;
  const pathname = typeof u.pathname === "string" ? u.pathname : null;
  if (!url || !pathname) return null;
  return { url, pathname };
};

const toDetail = (u: unknown): PublicationDetail | null => {
  if (!isRecord(u)) return null;
  const title = typeof u.title === "string" ? u.title : null;
  let content: string | string[] = "";
  if (typeof (u as Record<string, unknown>).content === "string") {
    content = (u as Record<string, unknown>).content as string;
  } else if (Array.isArray((u as Record<string, unknown>).content)) {
    const arr = (u as Record<string, unknown>).content as unknown[];
    content = arr
      .filter((p): p is string => typeof p === "string")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
  const date = typeof u.date === "string" ? u.date : "";
  const publicationUrl =
    typeof u.publicationUrl === "string" ? u.publicationUrl : "";
  const authors = Array.isArray(u.authors)
    ? (u.authors.filter((a) => typeof a === "string") as string[])
    : [];
  const venue = typeof u.venue === "string" ? u.venue : "";
  if (!title) return null;
  return { title, content, date, publicationUrl, authors, venue };
};

export async function fetchPublications(options?: {
  signal?: AbortSignal;
}): Promise<EnrichedItem[]> {
  const signal = options?.signal;

  // Fetch list
  const res = await fetch(`${API_BASE}/`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: unknown = await res.json();

  let listRaw: unknown[] = [];
  if (Array.isArray(json)) listRaw = json;
  else if (isRecord(json)) {
    const rec = json as Record<string, unknown> & {
      data?: unknown;
      items?: unknown;
    };
    if (Array.isArray(rec.data)) listRaw = rec.data as unknown[];
    else if (Array.isArray(rec.items)) listRaw = rec.items as unknown[];
  }

  const base = listRaw
    .map(toListItem)
    .filter((x): x is PublicationListItem => x !== null);

  // Fetch details for each item (parallel)
  const enriched = await Promise.all(
    base.map(async (b): Promise<EnrichedItem> => {
      try {
        const r = await fetch(withCacheBuster(b.url), { signal, cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const dJson: unknown = await r.json();
        const detail = toDetail(dJson);
        if (!detail) return { ...b, error: "Invalid detail schema" };
        return { ...b, detail };
      } catch (e: unknown) {
        if (isAbortError(e)) return { ...b };
        return {
          ...b,
          error: e instanceof Error ? e.message : "Failed to load details",
        };
      }
    })
  );

  return enriched;
}

export async function deletePublication(
  filename: string,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    signal: options?.signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) msg = data.message;
    } catch {
      // ignore parse error
    }
    throw new Error(msg);
  }
}

export type CreatePublicationPayload = {
  title: string;
  content: string | string[];
  date: string; // YYYY-MM-DD
  publicationUrl: string;
  authors: string[];
  venue: string;
};

export async function createPublication(
  payload: CreatePublicationPayload,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const res = await fetch(`${API_BASE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) msg = data.message;
    } catch {
      // ignore parse error
    }
    throw new Error(msg);
  }
}

export async function putPublication(
  id: string,
  payload: CreatePublicationPayload,
  options?: { signal?: AbortSignal }
): Promise<{ ok: boolean; blob: { pathname: string } }> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: JSON.stringify(payload),
      contentType: "application/json",
    }),
    signal: options?.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as { ok: boolean; blob: { pathname: string } };
}
