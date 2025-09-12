import { useEffect, useMemo, useState } from "react";
import LoadingOverlay from "./LoadingOverlay";
import { usePagination, Pagination } from "@polyutils/components";
import {
  fetchPublications,
  deletePublication,
  createPublication,
  putPublication,
  type EnrichedItem,
} from "../controllers/publicationsController";
import Modal from "./Modal";

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

// Parsing/fetching moved to controller

export default function PublicationsList() {
  const [items, setItems] = useState<EnrichedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 5;
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formAuthors, setFormAuthors] = useState("");
  const [formVenue, setFormVenue] = useState("");

  const resetAddForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormDate("");
    setFormUrl("");
    setFormAuthors("");
    setFormVenue("");
    setFormError(null);
    setEditId(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setError(null);
        const enriched = await fetchPublications({ signal: controller.signal });
        setItems(enriched);
      } catch (e: unknown) {
        if (isAbortError(e)) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const list = useMemo(() => items ?? [], [items]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const byDate = (d?: string): number => {
      if (!d) return 0;
      const t = Date.parse(d);
      return isNaN(t) ? 0 : t;
    };
    const base = [...list].sort(
      (a, b) => byDate(b.detail?.date) - byDate(a.detail?.date),
    );
    if (!q) return base;
    return base.filter(
      (it) => it.detail?.title && it.detail.title.toLowerCase().includes(q),
    );
  }, [list, searchQuery]);

  const {
    visible: paged,
    currentPage,
    totalPages,
    setPage,
  } = usePagination(filteredSorted, PAGE_SIZE);
  const isDeleting = deleting.size > 0;

  const refresh = async () => {
    try {
      setError(null);
      setItems(null);
      const enriched = await fetchPublications();
      setItems(enriched);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  };

  if (items === null)
    return (
      <>
        <div className="list-toolbar">
          <div className="toolbar-left">
            <button
              className="btn btn-default"
              onClick={refresh}
              disabled={isDeleting}
              title="Refresh publications"
            >
              <i className="fa-solid fa-rotate"></i>
              <span className="label">Refresh</span>
            </button>
          </div>
          <div className="toolbar-search">
            <input
              type="search"
              placeholder="Search by title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search publications by title"
            />
            <button
              type="button"
              className="icon-btn search-clear"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              style={{ visibility: searchQuery ? "visible" : "hidden" }}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
          <div className="toolbar-right">
            <button
              className="btn btn-primary"
              title="Add publication"
              onClick={() => {
                setFormError(null);
                setEditId(null);
                setAddOpen(true);
              }}
            >
              <i className="fa-solid fa-plus"></i>
              <span className="label">Add</span>
            </button>
          </div>
        </div>
        <LoadingOverlay label="Loading publications" />
      </>
    );

  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;

  const handleDelete = async (pathname: string) => {
    const filename = lastPathSegment(pathname);
    setDeleting((prev) => new Set(prev).add(pathname));
    try {
      await deletePublication(filename);
      // re-fetch after deletion
      const refreshed = await fetchPublications();
      setItems(refreshed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(pathname);
        return next;
      });
      setConfirmPath(null);
    }
  };

  if (list.length !== 0) {
    return (
      <>
        <div className="list-toolbar">
          <div className="toolbar-left">
            <button
              className="btn btn-default"
              onClick={refresh}
              disabled={isDeleting}
              title="Refresh publications"
            >
              <i className="fa-solid fa-rotate"></i>
              <span className="label">Refresh</span>
            </button>
          </div>
          <div className="toolbar-search">
            <input
              type="search"
              placeholder="Search by title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search publications by title"
            />
            <button
              type="button"
              className="icon-btn search-clear"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              style={{ visibility: searchQuery ? "visible" : "hidden" }}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
          <div className="toolbar-right">
            <button
              className="btn btn-primary"
              title="Add publication"
              onClick={() => {
                setFormError(null);
                setAddOpen(true);
              }}
            >
              <i className="fa-solid fa-plus"></i>
              <span className="label">Add</span>
            </button>
          </div>
        </div>
        <ul>
          {paged.map((item) => {
            const key = item.pathname;
            const d = item.detail;
            return (
              <li key={key} className="pub-item">
                <button
                  type="button"
                  className="icon-btn pub-edit"
                  aria-label="Edit publication"
                  title="Edit publication"
                  onClick={() => {
                    const d = item.detail;
                    if (!d) return;
                    const contentStr = Array.isArray(d.content)
                      ? d.content
                          .filter((p): p is string => typeof p === "string")
                          .map((p) => p.trim())
                          .filter((p) => p.length > 0)
                          .join("\n\n")
                      : typeof d.content === "string"
                        ? d.content
                        : "";
                    setFormTitle(d.title || "");
                    setFormContent(contentStr);
                    setFormDate(d.date || "");
                    setFormUrl(d.publicationUrl || "");
                    setFormAuthors(
                      (d.authors || []).filter(Boolean).join(", "),
                    );
                    setFormVenue(d.venue || "");
                    setFormError(null);
                    setEditId(lastPathSegment(item.pathname));
                    setAddOpen(true);
                  }}
                >
                  <i
                    className="fa-solid fa-pen-to-square"
                    aria-hidden="true"
                  ></i>
                </button>
                <button
                  type="button"
                  className="icon-btn pub-trash"
                  aria-label="Delete publication"
                  title="Delete publication"
                  onClick={() => setConfirmPath(item.pathname)}
                  aria-busy={deleting.has(item.pathname)}
                  disabled={deleting.has(item.pathname)}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
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
        <div className="pagination">
          <Pagination
            totalPages={totalPages}
            currentPage={currentPage}
            setPage={setPage}
          />
        </div>
        <LoadingOverlay open={isDeleting} label="Deleting publication" />
        <LoadingOverlay open={creating} label="Creating publication" />
        {/* Confirm delete modal */}
        <Modal
          open={!!confirmPath}
          onClose={() => setConfirmPath(null)}
          title="Delete publication"
          footer={
            <>
              <button
                className="btn btn-default"
                onClick={() => setConfirmPath(null)}
                disabled={confirmPath ? deleting.has(confirmPath) : false}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => confirmPath && handleDelete(confirmPath)}
                disabled={confirmPath ? deleting.has(confirmPath) : false}
              >
                Delete
              </button>
            </>
          }
        >
          <p>
            Are you sure you want to delete{" "}
            <strong>
              {confirmPath ? lastPathSegment(confirmPath) : "this item"}
            </strong>
            ?
          </p>
        </Modal>
        {/* Add publication modal */}
        <Modal
          open={addOpen}
          onClose={() => {
            resetAddForm();
            setFormError(null);
            setAddOpen(false);
          }}
          title={editId ? "Edit publication" : "Add publication"}
          closeOnBackdrop={false}
          className="modal--lg"
          footer={
            <>
              <button
                className="btn btn-default"
                onClick={() => {
                  resetAddForm();
                  setFormError(null);
                  setAddOpen(false);
                }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                form="pub-form"
                type="submit"
                className="btn btn-primary"
                disabled={creating}
                formNoValidate
              >
                Save
              </button>
            </>
          }
        >
          <form
            id="pub-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setFormError(null);
              if (
                !formTitle ||
                !formContent ||
                !formDate ||
                !formUrl ||
                !formAuthors ||
                !formVenue
              ) {
                setFormError("Please fill in all required fields.");
                return;
              }
              setCreating(true);
              try {
                // Normalize and validate URL ourselves
                const rawUrl = formUrl.trim();
                let normalizedUrl = rawUrl;
                const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
                if (!hasScheme) normalizedUrl = `https://${rawUrl}`;
                try {
                  // Throws if invalid
                  new URL(normalizedUrl);
                } catch {
                  setFormError(
                    "Please enter a valid URL (e.g., https://example.com)",
                  );
                  return;
                }
                const normalizedContent = formContent.replace(/\r\n/g, "\n");
                const authorsArr = formAuthors
                  .split(",")
                  .map((a) => a.trim())
                  .filter((a) => a.length > 0);

                if (editId) {
                  // Update existing publication: send content as list (paragraphs)
                  const paragraphs = normalizedContent
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  const payload = {
                    title: formTitle,
                    content: paragraphs.length
                      ? paragraphs
                      : [normalizedContent.trim()],
                    date: formDate,
                    publicationUrl: normalizedUrl,
                    authors: authorsArr,
                    venue: formVenue,
                  } as const;
                  try {
                    await putPublication(editId, payload);
                  } catch (err) {
                    setFormError(
                      err instanceof Error
                        ? err.message
                        : "Failed to update publication",
                    );
                    return;
                  }
                } else {
                  // Create new publication: server accepts an array of paragraphs
                  const paragraphs = normalizedContent
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  const payload = {
                    title: formTitle,
                    content: paragraphs.length
                      ? paragraphs
                      : [normalizedContent.trim()],
                    date: formDate,
                    publicationUrl: normalizedUrl,
                    authors: authorsArr,
                    venue: formVenue,
                  } as const;
                  try {
                    await createPublication(payload);
                  } catch (err) {
                    setFormError(
                      err instanceof Error
                        ? err.message
                        : "Failed to create publication",
                    );
                    return;
                  }
                }
                await refresh();
                setAddOpen(false);
                resetAddForm();
              } finally {
                setCreating(false);
              }
            }}
            className="pub-form"
          >
            {formError && (
              <p
                className="form-error"
                role="alert"
                style={{ color: "crimson", margin: 0 }}
              >
                {formError}
              </p>
            )}
            <div className="form-grid">
              <label>
                <span>Title</span>
                <input
                  id="pub-title"
                  name="title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Content</span>
                <textarea
                  id="pub-content"
                  name="content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  required
                  rows={5}
                />
              </label>
              <label>
                <span>Date</span>
                <div className="date-field">
                  <input
                    id="pub-date"
                    name="date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    onPointerDown={(e) => {
                      // Open the native picker on press; ignore NotAllowedError
                      e.preventDefault();
                      type DateInputEl = HTMLInputElement & {
                        showPicker?: () => void;
                      };
                      const el = e.currentTarget as DateInputEl;
                      try {
                        el.showPicker?.();
                      } catch {
                        /* ignore */
                      }
                      // Restore focus for accessibility (capture element to avoid null)
                      setTimeout(() => {
                        try {
                          el?.focus?.();
                        } catch {
                          // ignore
                        }
                      }, 0);
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn date-btn"
                    aria-label="Open date picker"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget
                        .previousElementSibling as HTMLInputElement | null;
                      if (input) {
                        (
                          input as HTMLInputElement & {
                            showPicker?: () => void;
                          }
                        ).showPicker?.();
                        setTimeout(() => {
                          try {
                            input.focus();
                          } catch {
                            // ignore
                          }
                        }, 0);
                      }
                    }}
                  >
                    <i
                      className="fa-solid fa-calendar-days"
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>
              </label>
              <label>
                <span>Publication URL</span>
                <input
                  id="pub-url"
                  name="publicationUrl"
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Authors (comma separated)</span>
                <input
                  id="pub-authors"
                  name="authors"
                  type="text"
                  value={formAuthors}
                  onChange={(e) => setFormAuthors(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Venue</span>
                <input
                  id="pub-venue"
                  name="venue"
                  type="text"
                  value={formVenue}
                  onChange={(e) => setFormVenue(e.target.value)}
                  required
                />
              </label>
            </div>
          </form>
        </Modal>
      </>
    );
  } else {
    return (
      <>
        <div className="list-toolbar">
          <div className="toolbar-left">
            <button
              className="btn btn-default"
              onClick={refresh}
              disabled={isDeleting}
              title="Refresh publications"
            >
              <i className="fa-solid fa-rotate"></i>
              <span className="label">Refresh</span>
            </button>
          </div>
          <div className="toolbar-search">
            <input
              type="search"
              placeholder="Search by title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search publications by title"
            />
            <button
              type="button"
              className="icon-btn search-clear"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              style={{ visibility: searchQuery ? "visible" : "hidden" }}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
          <div className="toolbar-right">
            <button
              className="btn btn-primary"
              title="Add publication"
              onClick={() => {
                setFormError(null);
                setAddOpen(true);
              }}
            >
              <i className="fa-solid fa-plus"></i>
              <span className="label">Add</span>
            </button>
          </div>
        </div>
        <p>No publications found.</p>
        <LoadingOverlay open={isDeleting} label="Deleting publication" />
        <LoadingOverlay open={creating} label="Creating publication" />
        {/* Add publication modal (also shown in empty state) */}
        <Modal
          open={addOpen}
          onClose={() => {
            resetAddForm();
            setFormError(null);
            setAddOpen(false);
          }}
          title="Add publication"
          className="modal--lg"
          footer={
            <>
              <button
                className="btn btn-default"
                onClick={() => {
                  resetAddForm();
                  setFormError(null);
                  setAddOpen(false);
                }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                form="pub-form"
                type="submit"
                className="btn btn-primary"
                disabled={creating}
                formNoValidate
              >
                Save
              </button>
            </>
          }
        >
          <form
            id="pub-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setFormError(null);
              if (
                !formTitle ||
                !formContent ||
                !formDate ||
                !formUrl ||
                !formAuthors ||
                !formVenue
              ) {
                setFormError("Please fill in all required fields.");
                return;
              }
              setCreating(true);
              try {
                // Normalize and validate URL ourselves
                const rawUrl = formUrl.trim();
                let normalizedUrl = rawUrl;
                const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
                if (!hasScheme) normalizedUrl = `https://${rawUrl}`;
                try {
                  // Throws if invalid
                  new URL(normalizedUrl);
                } catch {
                  setFormError(
                    "Please enter a valid URL (e.g., https://example.com)",
                  );
                  return;
                }
                // Convert content to array of paragraphs (double-newline separated)
                const normalizedContent = formContent.replace(/\r\n/g, "\n");
                const paragraphs = normalizedContent
                  .split(/\n{2,}/)
                  .map((p) => p.trim())
                  .filter((p) => p.length > 0);
                const payload = {
                  title: formTitle,
                  content: paragraphs.length
                    ? paragraphs
                    : [normalizedContent.trim()],
                  date: formDate,
                  publicationUrl: normalizedUrl,
                  authors: formAuthors
                    .split(",")
                    .map((a) => a.trim())
                    .filter((a) => a.length > 0),
                  venue: formVenue,
                };
                try {
                  await createPublication(payload);
                } catch (err) {
                  setFormError(
                    err instanceof Error
                      ? err.message
                      : "Failed to create publication",
                  );
                  return;
                }
                await refresh();
                setAddOpen(false);
                resetAddForm();
              } finally {
                setCreating(false);
              }
            }}
            className="pub-form"
          >
            {formError && (
              <p
                className="form-error"
                role="alert"
                style={{ color: "crimson", margin: 0 }}
              >
                {formError}
              </p>
            )}
            <div className="form-grid">
              <label>
                <span>Title</span>
                <input
                  id="pub-title"
                  name="title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Content</span>
                <textarea
                  id="pub-content"
                  name="content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  required
                  rows={5}
                />
              </label>
              <label>
                <span>Date</span>
                <div className="date-field">
                  <input
                    id="pub-date"
                    name="date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    onPointerDown={(e) => {
                      // Open the native picker on press; ignore NotAllowedError
                      e.preventDefault();
                      type DateInputEl = HTMLInputElement & {
                        showPicker?: () => void;
                      };
                      const el = e.currentTarget as DateInputEl;
                      try {
                        el.showPicker?.();
                      } catch {
                        /* ignore */
                      }
                      // Restore focus for accessibility (capture element to avoid null)
                      setTimeout(() => {
                        try {
                          el?.focus?.();
                        } catch {
                          // ignore
                        }
                      }, 0);
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn date-btn"
                    aria-label="Open date picker"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget
                        .previousElementSibling as HTMLInputElement | null;
                      if (input) {
                        (
                          input as HTMLInputElement & {
                            showPicker?: () => void;
                          }
                        ).showPicker?.();
                        setTimeout(() => {
                          try {
                            input.focus();
                          } catch {
                            // ignore
                          }
                        }, 0);
                      }
                    }}
                  >
                    <i
                      className="fa-solid fa-calendar-days"
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>
              </label>
              <label>
                <span>Publication URL</span>
                <input
                  id="pub-url"
                  name="publicationUrl"
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Authors (comma separated)</span>
                <input
                  id="pub-authors"
                  name="authors"
                  type="text"
                  value={formAuthors}
                  onChange={(e) => setFormAuthors(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Venue</span>
                <input
                  id="pub-venue"
                  name="venue"
                  type="text"
                  value={formVenue}
                  onChange={(e) => setFormVenue(e.target.value)}
                  required
                />
              </label>
            </div>
          </form>
        </Modal>
      </>
    );
  }
}
