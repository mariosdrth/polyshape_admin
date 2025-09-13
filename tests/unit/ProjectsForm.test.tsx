import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import ProjectsForm from "../../src/components/projects/ProjectsForm";

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

describe("ProjectsForm", () => {
  it("renders fields, shows error, and handles changes + submit", async () => {
    const props = {
      formError: "Oops",
      formTitle: "T",
      setFormTitle: vi.fn(),
      formContent: "Body",
      setFormContent: vi.fn(),
      formDate: "2024-01-01",
      setFormDate: vi.fn(),
      formPartnerName: "Org",
      setFormPartnerName: vi.fn(),
      formPartnerUrl: "https://x.com",
      setFormPartnerUrl: vi.fn(),
      onSubmit: vi.fn(),
    } as const;

    const { unmount } = render(<ProjectsForm {...props} />);
    await new Promise((r) => setTimeout(r, 0));

    // Error visible
    const alert = document.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Oops");

    // Input values
    const title = document.getElementById('proj-title') as HTMLInputElement;
    const content = document.getElementById('proj-content') as HTMLTextAreaElement;
    const date = document.getElementById('proj-date') as HTMLInputElement;
    const partnerName = document.getElementById('proj-partner-name') as HTMLInputElement;
    const partnerUrl = document.getElementById('proj-partner-url') as HTMLInputElement;
    expect(title.value).toBe('T');
    expect(content.value).toBe('Body');
    expect(date.value).toBe('2024-01-01');
    expect(partnerName.value).toBe('Org');
    expect(partnerUrl.value).toBe('https://x.com');

    // Submit
    const form = document.getElementById('proj-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(props.onSubmit).toHaveBeenCalled();

    unmount();
  });
});
