import React from "react";
import Modal from "../Modal";
import PublicationsForm from "./PublicationsForm";

type Props = {
  open: boolean;
  creating: boolean;
  editId: string | null;
  formError: string | null;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formContent: string;
  setFormContent: (v: string) => void;
  formDate: string;
  setFormDate: (v: string) => void;
  formUrl: string;
  setFormUrl: (v: string) => void;
  formAuthors: string;
  setFormAuthors: (v: string) => void;
  formVenue: string;
  setFormVenue: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onCancel: () => void;
};

export default function PublicationsAddEditModal({
  open,
  creating,
  editId,
  formError,
  formTitle,
  setFormTitle,
  formContent,
  setFormContent,
  formDate,
  setFormDate,
  formUrl,
  setFormUrl,
  formAuthors,
  setFormAuthors,
  formVenue,
  setFormVenue,
  onSubmit,
  onClose,
  onCancel,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editId ? "Edit publication" : "Add publication"}
      closeOnBackdrop={false}
      className="modal--lg"
      footer={
        <>
          <button className="btn btn-default" onClick={onCancel} disabled={creating}>
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
      <PublicationsForm
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
        onSubmit={onSubmit}
      />
    </Modal>
  );
}
