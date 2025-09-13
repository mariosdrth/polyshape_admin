import { useCallback, useMemo } from "react";
import { usePagination } from "@polyutils/components";
import {
  fetchPublications,
  createPublication,
  putPublication,
  deletePublication,
  type EnrichedItem,
} from "../../controllers/publicationsController";
import { normalizeContent } from "../../util/normalizeContent";
import { lastPathSegment } from "../../util/pathUtils";

type Params = {
  items: EnrichedItem[] | null;
  setItems: (items: EnrichedItem[] | null) => void;
  setError: (err: string | null) => void;
  setCreating: (v: boolean) => void;
  setAddOpen: (v: boolean) => void;
  resetAddForm: () => void;

  // form state (publications schema)
  formTitle: string;
  formContent: string;
  formDate: string;
  formUrl: string;       // publicationUrl
  formAuthors: string;   // comma-separated
  formVenue: string;

  editId: string | null;
  setFormError: (msg: string | null) => void;

  setDeleting: React.Dispatch<React.SetStateAction<Set<string>>>;
  setConfirmPath: (v: string | null) => void;

  searchQuery: string;
};

export function usePublicationsActions({
  items,
  setItems,
  setError,
  setCreating,
  setAddOpen,
  resetAddForm,
  formTitle,
  formContent,
  formDate,
  formUrl,
  formAuthors,
  formVenue,
  editId,
  setFormError,
  setDeleting,
  setConfirmPath,
  searchQuery,
}: Params) {
  // filter + sort
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

  // pagination
  const PAGE_SIZE = 5;
  const {
    visible: paged,
    currentPage,
    totalPages,
    setPage,
  } = usePagination(filteredSorted, PAGE_SIZE);

  // refresh
  const refresh = useCallback(async () => {
    try {
      setError(null);
      setItems(null);
      const enriched = await fetchPublications();
      setItems(enriched);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, [setItems, setError]);

  // create/update
  const handlePublicationFormSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle || !formContent || !formDate || !formUrl || !formAuthors || !formVenue) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setCreating(true);
    try {
      // normalize & validate publicationUrl
      const rawUrl = formUrl.trim();
      let normalizedUrl = rawUrl;
      const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
      if (!hasScheme) normalizedUrl = `https://${rawUrl}`;
      try {
        new URL(normalizedUrl);
      } catch {
        setFormError("Please enter a valid URL (e.g., https://example.com)");
        return;
      }

      // normalize content & authors
      const contentArray = normalizeContent(formContent);
      const authorsArr = formAuthors
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const payload = {
        title: formTitle,
        content: contentArray.length ? contentArray : [formContent.trim()],
        date: formDate,
        publicationUrl: normalizedUrl,
        authors: authorsArr,
        venue: formVenue,
      } as const;

      try {
        if (editId) {
          await putPublication(editId, payload);
        } else {
          await createPublication(payload);
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to save publication");
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
    formUrl,
    formAuthors,
    formVenue,
    editId,
    setFormError,
    setCreating,
    refresh,
    setAddOpen,
    resetAddForm,
  ]);

  // delete
  const handleDelete = useCallback(async (pathname: string) => {
    const filename = lastPathSegment(pathname);
    setDeleting((prev) => new Set(prev).add(pathname));
    try {
      await deletePublication(filename);
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
  }, [setDeleting, setItems, setError, setConfirmPath]);

  return {
    paged,
    currentPage,
    totalPages,
    setPage,
    refresh,
    handlePublicationFormSubmit,
    handleDelete,
  };
}
