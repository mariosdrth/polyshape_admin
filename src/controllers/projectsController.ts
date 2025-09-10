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

const API_BASE = "https://polyshape-mock.vercel.app/api/projects";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isAbortError = (e: unknown): e is DOMException =>
  e instanceof DOMException && e.name === "AbortError";

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
  const content = typeof u.content === "string" ? u.content : "";
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
  const res = await fetch(`${API_BASE}/list`, { signal });
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
        const r = await fetch(b.url, { signal });
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

export async function deleteProject(
  filename: string,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const res = await fetch(`${API_BASE}/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
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

export type CreateProjectPayload = {
  title: string;
  content: string | string[];
  date: string; // YYYY-MM-DD
  partner: ProjectPartner;
};

export async function createProject(
  payload: CreateProjectPayload,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const res = await fetch(`${API_BASE}/upload`, {
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
