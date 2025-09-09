import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  transitionMs?: number;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className,
  transitionMs = 180,
}: ModalProps) {
  // Mount while animating out, then unmount
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // next frame -> apply visible to trigger CSS transition
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), transitionMs);
      return () => clearTimeout(t);
    }
  }, [open, transitionMs]);
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onClose]);

  if (!mounted) return null;

  const content = (
    <div
      className={`modal-overlay ${visible ? "is-open" : ""}`.trim()}
      onClick={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${visible ? "is-open" : ""} ${className ?? ""}`.trim()} role="dialog" aria-modal="true" aria-labelledby={title ? "modal-title" : undefined}>
        {title && (
          <div className="modal-header">
            <h3 id="modal-title" className="modal-title">
              {title}
            </h3>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );

  const container = document.body;
  return createPortal(content, container);
}
