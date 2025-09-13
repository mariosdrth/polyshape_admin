import React from "react";

type Props = {
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
};

export default function PublicationsForm({
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
}: Props) {
  return (
    <form id="pub-form" onSubmit={onSubmit} className="pub-form">
      {formError && (
        <p className="form-error" role="alert" style={{ color: "crimson", margin: 0 }}>
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
          <span>Publication URL</span>
          <input
            id="pub-url"
            name="url"
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            required
          />
        </label>

        <label>
          <span>Authors (comma-separated)</span>
          <input
            id="pub-authors"
            name="authors"
            type="text"
            value={formAuthors}
            onChange={(e) => setFormAuthors(e.target.value)}
            placeholder="Author1, Author2"
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
  );
}
