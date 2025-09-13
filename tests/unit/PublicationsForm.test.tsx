import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import PublicationsForm from "../../src/components/publications/PublicationsForm";

function render(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(ui);
  return {
    container,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  };
}

describe("PublicationsForm", () => {
  it("renders fields, shows error, and handles changes + submit", async () => {
    const props = {
      formError: "Oops",
      formTitle: "T",
      setFormTitle: vi.fn(),
      formContent: "Body",
      setFormContent: vi.fn(),
      formDate: "2024-01-01",
      setFormDate: vi.fn(),
      formUrl: "https://x.com",
      setFormUrl: vi.fn(),
      formAuthors: "A,B",
      setFormAuthors: vi.fn(),
      formVenue: "J",
      setFormVenue: vi.fn(),
      onSubmit: vi.fn(),
    } as const;

    const { unmount } = render(<PublicationsForm {...props} />);
    await new Promise((r) => setTimeout(r, 0));

    // Error visible
    const alert = document.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Oops");

    // Input values
    const title = document.getElementById('pub-title') as HTMLInputElement;
    const content = document.getElementById('pub-content') as HTMLTextAreaElement;
    const date = document.getElementById('pub-date') as HTMLInputElement;
    const url = document.getElementById('pub-url') as HTMLInputElement;
    const authors = document.getElementById('pub-authors') as HTMLInputElement;
    const venue = document.getElementById('pub-venue') as HTMLInputElement;
    expect(title.value).toBe('T');
    expect(content.value).toBe('Body');
    expect(date.value).toBe('2024-01-01');
    expect(url.value).toBe('https://x.com');
    expect(authors.value).toBe('A,B');
    expect(venue.value).toBe('J');

    // Submit
    const form = document.getElementById('pub-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(props.onSubmit).toHaveBeenCalled();

    unmount();
  });
});
