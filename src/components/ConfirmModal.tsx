import Modal from "./Modal";

type Props = {
  open: boolean;
  title: string;
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
};

export default function ConfirmModal({
  open,
  title,
  itemName,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button className="btn btn-default" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            Delete
          </button>
        </>
      }
    >
      <p>
        Are you sure you want to delete{" "}
        <strong>{itemName || "this item"}</strong>?
      </p>
    </Modal>
  );
}
