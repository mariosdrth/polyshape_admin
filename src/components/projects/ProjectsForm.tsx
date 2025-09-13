import React from "react";

type Props = {
  formError: string | null;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formContent: string;
  setFormContent: (v: string) => void;
  formDate: string;
  setFormDate: (v: string) => void;
  formPartnerName: string;
  setFormPartnerName: (v: string) => void;
  formPartnerUrl: string;
  setFormPartnerUrl: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function ProjectsForm(props: Props) {
  const {
    formError,
    formTitle,
    setFormTitle,
    formContent,
    setFormContent,
    formDate,
    setFormDate,
    formPartnerName,
    setFormPartnerName,
    formPartnerUrl,
    setFormPartnerUrl,
    onSubmit,
  } = props;

  return (
    <form id="proj-form" onSubmit={onSubmit} className="proj-form">
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
                const input = e.currentTarget.previousElementSibling as HTMLInputElement | null;
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
  );
}
