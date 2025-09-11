import { API_ROOT } from "../properties";

export type ProjectListItem = {
  url: string;
  pathname: string;
};

export type ProjectPartner = {
  name: string;
  url: string;
};

export type ProjectDetail = {
  title: string;
  content: string;
  date: string;
  partner: ProjectPartner;
};

export type EnrichedItem = ProjectListItem & {
  detail?: ProjectDetail;
  error?: string;
};

const API_BASE = `${API_ROOT}/projects`;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isAbortError = (e: unknown): e is DOMException =>
  e instanceof DOMException && e.name === "AbortError";

const withCacheBuster = (urlStr: string): string => {
  try {
    const u = new URL(urlStr);
    u.searchParams.set("_", Date.now().toString());
    return u.toString();
  } catch {
    // Fallback if URL parsing fails
    const sep = urlStr.includes("?") ? "&" : "?";
    return `${urlStr}${sep}_=${Date.now()}`;
  }
};

const toListItem = (u: unknown): ProjectListItem | null => {
  if (!isRecord(u)) return null;
  const url = typeof u.url === "string" ? u.url : null;
  const pathname = typeof u.pathname === "string" ? u.pathname : null;
  if (!url || !pathname) return null;
  return { url, pathname };
};

const toDetail = (u: unknown): ProjectDetail | null => {
  if (!isRecord(u)) return null;
  const title = typeof u.title === "string" ? u.title : null;
  let content: string = "";
  const rawContent = (u as Record<string, unknown>).content;
  if (typeof rawContent === "string") {
    content = rawContent;
  } else if (Array.isArray(rawContent)) {
    const parts = rawContent.filter((p): p is string => typeof p === "string").map((p) => p.trim()).filter((p) => p.length > 0);
    content = parts.join("\n\n");
  }
  const date = typeof u.date === "string" ? u.date : "";

  let partner: ProjectPartner = { name: "", url: "" };
  const rawPartner = isRecord((u as Record<string, unknown>).partner)
    ? ((u as Record<string, unknown>).partner as Record<string, unknown>)
    : null;
  if (rawPartner) {
    partner = {
      name: typeof rawPartner.name === "string" ? rawPartner.name : "",
      url: typeof rawPartner.url === "string" ? rawPartner.url : "",
    };
  }

  if (!title) return null;
  return { title, content, date, partner };
};

export async function fetchProjects(options?: {
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
    .filter((x): x is ProjectListItem => x !== null);

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

export async function fetchProject(
  id: string,
  options?: { signal?: AbortSignal }
): Promise<{ id: string; content: ProjectDetail }> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "GET",
    signal: options?.signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const { id: projectId, content } = data as {
    ok: boolean;
    id: string;
    content: ProjectDetail;
  };

  return { id: projectId, content };
}

export async function deleteProject(
  id: string,
  options?: { signal?: AbortSignal }
): Promise<{ ok: boolean; deleted: string }> {
  const res = await fetch(
    `${API_BASE}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      signal: options?.signal,
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as { ok: boolean; deleted: string };
}

export type CreateProjectPayload = {
  title: string;
  content: string | string[];
  date: string; // YYYY-MM-DD
  partner: ProjectPartner;
};

export async function createProject(
  payload: CreateProjectPayload,
  options?: { signal?: AbortSignal }
): Promise<{ ok: boolean; created: unknown }> {
  const res = await fetch(`${API_BASE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as { ok: boolean; created: unknown };
}

export async function putProject(
  id: string,
  payload: CreateProjectPayload,
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
