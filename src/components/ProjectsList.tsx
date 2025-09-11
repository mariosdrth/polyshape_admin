import { useEffect, useMemo, useState } from "react";
import LoadingOverlay from "./LoadingOverlay";
import { fetchProjects, deleteProject, createProject, putProject, type EnrichedItem } from "../controllers/projectsController";
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

export default function ProjectsList() {
  const [items, setItems] = useState<EnrichedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formPartnerName, setFormPartnerName] = useState("");
  const [formPartnerUrl, setFormPartnerUrl] = useState("");

  const resetAddForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormDate("");
    setFormPartnerName("");
    setFormPartnerUrl("");
    setFormError(null);
    setEditId(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setError(null);
        const enriched = await fetchProjects({ signal: controller.signal });
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
    const base = [...list].sort((a, b) => byDate(b.detail?.date) - byDate(a.detail?.date));
    if (!q) return base;
    return base.filter((it) => it.detail?.title && it.detail.title.toLowerCase().includes(q));
  }, [list, searchQuery]);

  // Reset/clamp page when result set changes
  useEffect(() => {
    if (!filteredSorted.length) {
      setPage(1);
      return;
    }
    const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [filteredSorted]);
  const isDeleting = deleting.size > 0;

  const refresh = async () => {
    try {
      setError(null);
      setItems(null);
      const enriched = await fetchProjects();
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
            <button className="btn btn-default" onClick={refresh} disabled={isDeleting} title="Refresh projects">
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
              aria-label="Search projects by title"
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
            <button className="btn btn-primary" title="Add project" onClick={() => { setFormError(null); setEditId(null); setAddOpen(true); }}>
              <i className="fa-solid fa-plus"></i>
              <span className="label">Add</span>
            </button>
          </div>
        </div>
        <LoadingOverlay label="Loading projects" />
      </>
    );

  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;

  const handleDelete = async (pathname: string) => {
    const filename = lastPathSegment(pathname);
    setDeleting((prev) => new Set(prev).add(pathname));
    try {
      await deleteProject(filename);
      // re-fetch after deletion
      const refreshed = await fetchProjects();
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

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paged = filteredSorted.slice(start, start + PAGE_SIZE);

  if (list.length !== 0) {
    return (
      <>
        <div className="list-toolbar">
          <div className="toolbar-left">
            <button className="btn btn-default" onClick={refresh} disabled={isDeleting} title="Refresh projects">
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
              aria-label="Search projects by title"
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
            <button className="btn btn-primary" title="Add project" onClick={() => { setFormError(null); setAddOpen(true); }}>
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
              <li key={key} className="proj-item">
                <button
                  type="button"
                  className="icon-btn proj-edit"
                  aria-label="Edit project"
                  title="Edit project"
                  onClick={() => {
                    const d = item.detail;
                    if (!d) return;
                    let contentStr = "";
                    const rawContent = (d as unknown as { content?: unknown }).content;
                    if (Array.isArray(rawContent)) {
                      contentStr = rawContent
                        .filter((p): p is string => typeof p === "string")
                        .map((p) => p.trim())
                        .filter((p) => p.length > 0)
                        .join("\n\n");
                    } else if (typeof rawContent === "string") {
                      contentStr = rawContent;
                    }
                    setFormTitle(d.title || "");
                    setFormContent(contentStr);
                    setFormDate(d.date || "");
                    setFormPartnerName(d.partner?.name || "");
                    setFormPartnerUrl(d.partner?.url || "");
                    setFormError(null);
                    setEditId(lastPathSegment(item.pathname));
                    setAddOpen(true);
                  }}
                >
                  <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  className="icon-btn proj-trash"
                  aria-label="Delete project"
                  title="Delete project"
                  onClick={() => setConfirmPath(item.pathname)}
                  aria-busy={deleting.has(item.pathname)}
                  disabled={deleting.has(item.pathname)}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
                <h3 className="proj-pathname" title={item.pathname}>
                  {lastPathSegment(item.pathname)}
                </h3>
                {!d && item.error && (
                  <p className="proj-error" style={{ color: "crimson" }}>
                    Error: {item.error}
                  </p>
                )}
                {d && (
                  <div className="proj-content">
                    <div className="proj-header">
                      <span className="proj-date" title={d.date}>
                        {d.date}
                      </span>
                      <h2 className="proj-title">{d.title}</h2>
                    </div>
                    <div className="proj-meta">
                      {d.partner?.name && (
                        <div className="proj-partner" title={d.partner.name}>
                          Partner: {d.partner.url ? (
                            <a href={d.partner.url} target="_blank" rel="noreferrer">{d.partner.name}</a>
                          ) : (
                            d.partner.name
                          )}
                        </div>
                      )}
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
        <LoadingOverlay open={isDeleting} label="Deleting project" />
        <LoadingOverlay open={creating} label="Creating project" />
        {/* Confirm delete modal */}
        <Modal
          open={!!confirmPath}
          onClose={() => setConfirmPath(null)}
          title="Delete project"
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
            <strong>{confirmPath ? lastPathSegment(confirmPath) : "this item"}</strong>?
          </p>
        </Modal>
        {/* Add project modal */}
        <Modal
          open={addOpen}
          onClose={() => { resetAddForm(); setFormError(null); setAddOpen(false); }}
          title={editId ? "Edit project" : "Add project"}
          closeOnBackdrop={false}
          className="modal--lg"
          footer={
            <>
              <button
                className="btn btn-default"
                onClick={() => { resetAddForm(); setFormError(null); setAddOpen(false); }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                form="proj-form"
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
            id="proj-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setFormError(null);
              if (!formTitle || !formContent || !formDate || !formPartnerName || !formPartnerUrl) {
                setFormError("Please fill in all required fields.");
                return;
              }
              setCreating(true);
              try {
                // Normalize and validate Partner URL
                const rawUrl = formPartnerUrl.trim();
                let normalizedUrl = rawUrl;
                const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
                if (!hasScheme) normalizedUrl = `https://${rawUrl}`;
                try {
                  new URL(normalizedUrl);
                } catch {
                  setFormError("Please enter a valid partner URL (e.g., https://example.com)");
                  return;
                }
                const normalized = formContent.replace(/\r\n/g, "\n");
                if (editId) {
                  // Update existing project: server expects content as a list (paragraphs)
                  const contentArray = normalized
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  const payload = {
                    title: formTitle,
                    content: contentArray.length ? contentArray : [normalized.trim()],
                    date: formDate,
                    partner: { name: formPartnerName, url: normalizedUrl },
                  } as const;
                  try {
                    await putProject(editId, payload);
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : "Failed to update project");
                    return;
                  }
                } else {
                  // Create new project: API expects content as paragraphs array
                  const contentArray = normalized
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  const payload = {
                    title: formTitle,
                    content: contentArray.length ? contentArray : [normalized.trim()],
                    date: formDate,
                    partner: { name: formPartnerName, url: normalizedUrl },
                  } as const;
                  try {
                    await createProject(payload);
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : "Failed to create project");
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
            className="proj-form"
          >
            {formError && (
              <p className="form-error" role="alert" style={{ color: "crimson", margin: 0 }}>
                {formError}
              </p>
            )}
            <div className="form-grid">
              <label>
                <span>Title</span>
                <input
                  id="proj-title"
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
                  id="proj-content"
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
                    id="proj-date"
                    name="date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      type DateInputEl = HTMLInputElement & { showPicker?: () => void };
                      const el = e.currentTarget as DateInputEl;
                      try { el.showPicker?.(); } catch { /* ignore */ }
                      setTimeout(() => { try { el?.focus?.(); } catch {
                        // ignore
                      } }, 0);
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn date-btn"
                    aria-label="Open date picker"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement | null);
                      if (input) {
                        (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                        setTimeout(() => { try { input.focus(); } catch {
                          // ignore
                        } }, 0);
                      }
                    }}
                  >
                    <i className="fa-solid fa-calendar-days" aria-hidden="true"></i>
                  </button>
                </div>
              </label>
              <label>
                <span>Partner Name</span>
                <input
                  id="proj-partner-name"
                  name="partnerName"
                  type="text"
                  value={formPartnerName}
                  onChange={(e) => setFormPartnerName(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Partner URL</span>
                <input
                  id="proj-partner-url"
                  name="partnerUrl"
                  type="url"
                  value={formPartnerUrl}
                  onChange={(e) => setFormPartnerUrl(e.target.value)}
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
            <button className="btn btn-default" onClick={refresh} disabled={isDeleting} title="Refresh projects">
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
              aria-label="Search projects by title"
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
            <button className="btn btn-primary" title="Add project" onClick={() => { setFormError(null); setAddOpen(true); }}>
              <i className="fa-solid fa-plus"></i>
              <span className="label">Add</span>
            </button>
          </div>
        </div>
        <p>No projects found.</p>
        <LoadingOverlay open={isDeleting} label="Deleting project" />
        <LoadingOverlay open={creating} label="Creating project" />
        {/* Add project modal (also shown in empty state) */}
        <Modal
          open={addOpen}
          onClose={() => { resetAddForm(); setFormError(null); setAddOpen(false); }}
          title="Add project"
          className="modal--lg"
          footer={
            <>
              <button
                className="btn btn-default"
                onClick={() => { resetAddForm(); setFormError(null); setAddOpen(false); }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                form="proj-form"
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
            id="proj-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setFormError(null);
              if (!formTitle || !formContent || !formDate || !formPartnerName || !formPartnerUrl) {
                setFormError("Please fill in all required fields.");
                return;
              }
              setCreating(true);
              try {
                const rawUrl = formPartnerUrl.trim();
                let normalizedUrl = rawUrl;
                const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
                if (!hasScheme) normalizedUrl = `https://${rawUrl}`;
                try { new URL(normalizedUrl); } catch {
                  setFormError("Please enter a valid partner URL (e.g., https://example.com)");
                  return;
                }
                const normalized = formContent.replace(/\r\n/g, "\n");
                const contentArray = normalized
                  .split(/\n{2,}/)
                  .map((p) => p.trim())
                  .filter((p) => p.length > 0);
                const payload = {
                  title: formTitle,
                  content: contentArray.length ? contentArray : [normalized.trim()],
                  date: formDate,
                  partner: { name: formPartnerName, url: normalizedUrl },
                } as const;
                try {
                  await createProject(payload);
                } catch (err) {
                  setFormError(err instanceof Error ? err.message : "Failed to create project");
                  return;
                }
                await refresh();
                setAddOpen(false);
                resetAddForm();
              } finally {
                setCreating(false);
              }
            }}
            className="proj-form"
          >
            {formError && (
              <p className="form-error" role="alert" style={{ color: "crimson", margin: 0 }}>
                {formError}
              </p>
            )}
            <div className="form-grid">
              <label>
                <span>Title</span>
                <input
                  id="proj-title"
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
                  id="proj-content"
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
                    id="proj-date"
                    name="date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      type DateInputEl = HTMLInputElement & { showPicker?: () => void };
                      const el = e.currentTarget as DateInputEl;
                      try { el.showPicker?.(); } catch {
                        // ignore
                      }
                      setTimeout(() => { try { el?.focus?.(); } catch {
                        // ignore
                      } }, 0);
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="icon-btn date-btn"
                    aria-label="Open date picker"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement | null);
                      if (input) {
                        (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                        setTimeout(() => { try { input.focus(); } catch {
                          // ignore
                        } }, 0);
                      }
                    }}
                  >
                    <i className="fa-solid fa-calendar-days" aria-hidden="true"></i>
                  </button>
                </div>
              </label>
              <label>
                <span>Partner Name</span>
                <input
                  id="proj-partner-name"
                  name="partnerName"
                  type="text"
                  value={formPartnerName}
                  onChange={(e) => setFormPartnerName(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Partner URL</span>
                <input
                  id="proj-partner-url"
                  name="partnerUrl"
                  type="url"
                  value={formPartnerUrl}
                  onChange={(e) => setFormPartnerUrl(e.target.value)}
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
