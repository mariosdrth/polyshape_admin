import { useCallback, useMemo } from "react";
import { usePagination } from "@polyutils/components";
import { fetchProjects, createProject, putProject, deleteProject, type EnrichedItem } from "../../controllers/projectsController";
import { normalizeContent } from "../../util/normalizeContent";
import { lastPathSegment } from "../../util/pathUtils";

type Params = {
  items: EnrichedItem[] | null;
  setItems: (items: EnrichedItem[] | null) => void;
  setError: (err: string | null) => void;
  setCreating: (v: boolean) => void;
  setAddOpen: (v: boolean) => void;
  resetAddForm: () => void;
  formTitle: string;
  formContent: string;
  formDate: string;
  formPartnerName: string;
  formPartnerUrl: string;
  editId: string | null;
  setFormError: (msg: string | null) => void;
  setDeleting: React.Dispatch<React.SetStateAction<Set<string>>>;
  setConfirmPath: (v: string | null) => void;
  searchQuery: string;
};

export function useProjectsActions({
  items,
  setItems,
  setError,
  setCreating,
  setAddOpen,
  resetAddForm,
  formTitle,
  formContent,
  formDate,
  formPartnerName,
  formPartnerUrl,
  editId,
  setFormError,
  setDeleting,
  setConfirmPath,
  searchQuery,
}: Params) {
  // ----- Filter + Sort -----
  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const byDate = (d?: string): number => {
      if (!d) return 0;
      const t = Date.parse(d);
      return isNaN(t) ? 0 : t;
    };
    const base = [...(items ?? [])].sort(
      (a, b) => byDate(b.detail?.date) - byDate(a.detail?.date),
    );
    if (!q) return base;
    return base.filter(
      (it) => it.detail?.title && it.detail.title.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  // ----- Pagination -----
  const PAGE_SIZE = 5;
  const {
    visible: paged,
    currentPage,
    totalPages,
    setPage,
  } = usePagination(filteredSorted, PAGE_SIZE);

  // ----- Refresh -----
  const refresh = useCallback(async () => {
    try {
      setError(null);
      setItems(null);
      const enriched = await fetchProjects();
      setItems(enriched);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, [setItems, setError]);

  // ----- Create / Update -----
  const handleProjectFormSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
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
      try {
        new URL(normalizedUrl);
      } catch {
        setFormError("Please enter a valid partner URL (e.g., https://example.com)");
        return;
      }
      const contentArray = normalizeContent(formContent);
      const payload = {
        title: formTitle,
        content: contentArray.length ? contentArray : [formContent.trim()],
        date: formDate,
        partner: { name: formPartnerName, url: normalizedUrl },
      } as const;

      try {
        if (editId) {
          await putProject(editId, payload);
        } else {
          await createProject(payload);
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to save project");
        return;
      }

      await refresh();
      setAddOpen(false);
      resetAddForm();
    } finally {
      setCreating(false);
    }
  }, [
    formTitle,
    formContent,
    formDate,
    formPartnerName,
    formPartnerUrl,
    editId,
    setFormError,
    setCreating,
    refresh,
    setAddOpen,
    resetAddForm,
  ]);

  // ----- Delete -----
  const handleDelete = useCallback(async (pathname: string) => {
    const filename = lastPathSegment(pathname);
    setDeleting(prev => new Set(prev).add(pathname));
    try {
      await deleteProject(filename);
      const refreshed = await fetchProjects();
      setItems(refreshed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(prev => {
        const next = new Set(prev);
        next.delete(pathname);
        return next;
      });
      setConfirmPath(null);
    }
  }, [setDeleting, setItems, setError, setConfirmPath]);

  return {
    paged,
    currentPage,
    totalPages,
    setPage,
    refresh,
    handleProjectFormSubmit,
    handleDelete,
  };
}
