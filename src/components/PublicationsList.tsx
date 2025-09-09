import { useEffect, useMemo, useState } from "react";

type PublicationListItem = {
  url: string;
  pathname: string;
};

type PublicationDetail = {
  title: string;
  content: string;
  date: string;
  publicationUrl: string;
  authors: string[];
  venue: string;
};

type EnrichedItem = PublicationListItem & {
  detail?: PublicationDetail;
  error?: string;
};

const API_URL = "https://polyshape-mock.vercel.app/api/publications/list";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const isAbortError = (e: unknown): e is DOMException =>
  e instanceof DOMException && e.name === "AbortError";

const lastPathSegment = (path: string): string => {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  const raw = idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

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
  const content = typeof u.content === "string" ? u.content : "";
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

export default function PublicationsList() {
  const [items, setItems] = useState<EnrichedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setError(null);
        // Fetch list
        const res = await fetch(API_URL, { signal: controller.signal });
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
              const r = await fetch(b.url, { signal: controller.signal });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              const dJson: unknown = await r.json();
              const detail = toDetail(dJson);
              if (!detail) return { ...b, error: "Invalid detail schema" };
              return { ...b, detail };
            } catch (e: unknown) {
              if (isAbortError(e)) return { ...b };
              return {
                ...b,
                error:
                  e instanceof Error ? e.message : "Failed to load details",
              };
            }
          }),
        );

        setItems(enriched);
      } catch (e: unknown) {
        if (isAbortError(e)) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        // no-op
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const list = useMemo(() => items ?? [], [items]);

  // Reset/clamp page when list changes
  useEffect(() => {
    if (!list.length) {
      setPage(1);
      return;
    }
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [list]);

  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;
  if (items === null) return <p>Loading publications…</p>;

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paged = list.slice(start, start + PAGE_SIZE);

  if (list.length !== 0) {
    return (
      <>
        <ul>
          {paged.map((item) => {
            const key = item.pathname;
            const d = item.detail;
            return (
              <li key={key} className="pub-item">
                <h3 className="pub-pathname" title={item.pathname}>
                  {lastPathSegment(item.pathname)}
                </h3>
                {!d && item.error && (
                  <p className="pub-error" style={{ color: "crimson" }}>
                    Error: {item.error}
                  </p>
                )}
                {d && (
                  <div className="pub-content">
                    <div className="pub-header">
                      <span className="pub-date" title={d.date}>
                        {d.date}
                      </span>
                      <h2 className="pub-title">{d.title}</h2>
                    </div>
                    <div className="pub-meta">
                      {d.authors.length > 0 && (
                        <div
                          className="pub-authors"
                          title={d.authors.filter(Boolean).join(", ")}
                        >
                          {d.authors.filter(Boolean).join(", ")}
                        </div>
                      )}
                      {d.venue && <div className="pub-venue">{d.venue}</div>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {list.length > PAGE_SIZE && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  } else {
    return <p>No publications found.</p>;
  }
}
