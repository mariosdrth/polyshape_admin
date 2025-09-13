import { useEffect, useState } from "react";
import {
  fetchProjects,
  type EnrichedItem,
} from "../../controllers/projectsController";
import ProjectsToolbar from "./ProjectsToolbar";
import ProjectsAddEditModal from "./ProjectsAddEditModal";
import ProjectsListItems from "./ProjectsListItems";
import { lastPathSegment } from "../../util/pathUtils";
import { useProjectsActions } from "./useProjectsActions";
import ConfirmModal from "../ConfirmModal";
import ListLayout from "../ListLayout";
import LoadingOverlay from "../LoadingOverlay";
import { joinContentForEdit } from "../../util/normalizeContent";

const isAbortError = (e: unknown): e is DOMException =>
  e instanceof DOMException && e.name === "AbortError";

export default function ProjectsList() {
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

  const {
    paged,
    currentPage,
    totalPages,
    setPage,
    refresh,
    handleProjectFormSubmit,
    handleDelete,
  } = useProjectsActions({
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
  });

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

  const isDeleting = deleting.size > 0;

  const renderAddEditModal = () => (
    <ProjectsAddEditModal
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
      formPartnerName={formPartnerName}
      setFormPartnerName={setFormPartnerName}
      formPartnerUrl={formPartnerUrl}
      setFormPartnerUrl={setFormPartnerUrl}
      onSubmit={handleProjectFormSubmit}
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
        <ProjectsToolbar
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
        <LoadingOverlay open label="Loading projects" />
      </>
    );

  if (error) {
    return <p style={{ color: "crimson" }}>Error: {error}</p>;
  }

  return (
    <ListLayout
      toolbar={
        <ProjectsToolbar
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
          title="Delete project"
          itemName={confirmPath ? lastPathSegment(confirmPath) : ""}
          onCancel={() => setConfirmPath(null)}
          onConfirm={() => confirmPath && handleDelete(confirmPath)}
          busy={confirmPath ? deleting.has(confirmPath) : false}
        />
      }
      addEditModal={renderAddEditModal()}
    >
      {paged.length > 0 ? (
        <ProjectsListItems
          items={paged}
          deleting={deleting}
          onEdit={(item) => {
            const d = item.detail;
            if (!d) return;
            const contentStr = joinContentForEdit(d.content);
            setFormTitle(d.title || "");
            setFormContent(contentStr);
            setFormDate(d.date || "");
            setFormPartnerName(d.partner?.name || "");
            setFormPartnerUrl(d.partner?.url || "");
            setFormError(null);
            setEditId(lastPathSegment(item.pathname));
            setAddOpen(true);
          }}
          onDeleteRequest={(pathname) => setConfirmPath(pathname)}
        />
      ) : (
        <p>No projects found.</p>
      )}
    </ListLayout>
  );
}
