import { useEffect, useState } from "react";
import {
  fetchPublications,
  type EnrichedItem,
} from "../../controllers/publicationsController";
import PublicationsToolbar from "./PublicationsToolbar";
import ConfirmModal from "../ConfirmModal";
import PublicationsAddEditModal from "./PublicationsAddEditModal";
import PublicationsListItems from "./PublicationsListItems";
import { lastPathSegment } from "../../util/pathUtils";
import { usePublicationsActions } from "./usePublicationsActions";
import ListLayout from "../ListLayout";
import LoadingOverlay from "../LoadingOverlay";
import { joinContentForEdit } from "../../util/normalizeContent";

const isAbortError = (e: unknown): e is DOMException =>
  e instanceof DOMException && e.name === "AbortError";

export default function PublicationsList() {
  const [items, setItems] = useState<EnrichedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const {
    paged,
    currentPage,
    totalPages,
    setPage,
    refresh,
    handlePublicationFormSubmit,
    handleDelete,
  } = usePublicationsActions({
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
  });

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

  const isDeleting = deleting.size > 0;

  const renderAddEditModal = () => (
    <PublicationsAddEditModal
      open={addOpen}
      creating={creating}
      editId={editId}
      formError={formError}
      formTitle={formTitle}
      setFormTitle={setFormTitle}
      formContent={formContent}
      setFormContent={setFormContent}
      formDate={formDate}
      setFormDate={setFormDate}
      formUrl={formUrl}
      setFormUrl={setFormUrl}
      formAuthors={formAuthors}
      setFormAuthors={setFormAuthors}
      formVenue={formVenue}
      setFormVenue={setFormVenue}
      onSubmit={handlePublicationFormSubmit}
      onClose={() => {
        resetAddForm();
        setFormError(null);
        setAddOpen(false);
      }}
      onCancel={() => {
        resetAddForm();
        setFormError(null);
        setAddOpen(false);
      }}
    />
  );

  if (items === null)
    return (
      <>
        <PublicationsToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={refresh}
          onAdd={() => {
            setFormError(null);
            setEditId(null);
            setAddOpen(true);
          }}
          isDeleting={isDeleting}
        />
        {/* Full-screen loading overlay while fetching list */}
        <LoadingOverlay open label="Loading publications" />
      </>
    );

  if (error) {
    return <p style={{ color: "crimson" }}>Error: {error}</p>;
  }

  return (
    <ListLayout
      toolbar={
        <PublicationsToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={refresh}
          onAdd={() => {
            setFormError(null);
            setEditId(null);
            setAddOpen(true);
          }}
          isDeleting={isDeleting}
        />
      }
      isDeleting={isDeleting}
      creating={creating}
      totalPages={totalPages}
      currentPage={currentPage}
      setPage={setPage}
      confirmModal={
        <ConfirmModal
          open={!!confirmPath}
          title="Delete publication"
          itemName={confirmPath ? lastPathSegment(confirmPath) : ""}
          onCancel={() => setConfirmPath(null)}
          onConfirm={() => confirmPath && handleDelete(confirmPath)}
          busy={confirmPath ? deleting.has(confirmPath) : false}
        />
      }
      addEditModal={renderAddEditModal()}
    >
      {paged.length > 0 ? (
        <PublicationsListItems
          items={paged}
          deleting={deleting}
          onEdit={(item) => {
            const d = item.detail;
            if (!d) return;
            const contentStr = joinContentForEdit(d.content);
            setFormTitle(d.title || "");
            setFormContent(contentStr);
            setFormDate(d.date || "");
            setFormUrl(d.publicationUrl || "");
            setFormAuthors((d.authors || []).join(", "));
            setFormVenue(d.venue || "");
            setFormError(null);
            setEditId(lastPathSegment(item.pathname));
            setAddOpen(true);
          }}
          onDeleteRequest={(pathname) => setConfirmPath(pathname)}
        />
      ) : (
        <p>No publications found.</p>
      )}
    </ListLayout>
  );
}
