import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { usePublicationsActions } from "../../src/components/publications/usePublicationsActions";
import * as publicationsController from "../../src/controllers/publicationsController";

// Mock pagination util so `paged` equals filtered list without slicing
vi.mock("@polyutils/components", () => {
  return {
    usePagination: (items: unknown[], _pageSize: number) => {
      void _pageSize; // mark used to satisfy no-unused-vars
      return {
        visible: items,
        currentPage: 1,
        totalPages: 1,
        setPage: vi.fn(),
      };
    },
  };
});

// Mock controller API
vi.mock("../../src/controllers/publicationsController", async () => {
  return {
    fetchPublications: vi.fn(),
    createPublication: vi.fn(),
    putPublication: vi.fn(),
    deletePublication: vi.fn(),
  };
});

type EnrichedItem = publicationsController.EnrichedItem;
type HookParams = {
  items: EnrichedItem[] | null;
  setItems: (items: EnrichedItem[] | null) => void;
  setError: (err: string | null) => void;
  setCreating: (v: boolean) => void;
  setAddOpen: (v: boolean) => void;
  resetAddForm: () => void;
  formTitle: string;
  formContent: string;
  formDate: string;
  formUrl: string;
  formAuthors: string;
  formVenue: string;
  editId: string | null;
  setFormError: (msg: string | null) => void;
  setDeleting: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setConfirmPath: (v: string | null) => void;
  searchQuery: string;
};

function renderHook(params: HookParams) {
  let api: ReturnType<typeof usePublicationsActions> | null = null;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const Harness: React.FC<{ params: HookParams }> = ({ params }) => {
    const res = usePublicationsActions(params);
    // Assign synchronously during render so tests can access immediately after commit
    api = res;
    return null;
  };

  root.render(React.createElement(Harness, { params }));

  const waitForReady = async () => {
    // wait for first effect flush
    await new Promise((r) => setTimeout(r, 0));
    if (!api) throw new Error("hook not initialized");
    return api;
  };

  const rerender = (nextParams: HookParams) => {
    root.render(React.createElement(Harness, { params: nextParams }));
  };

  const unmount = () => {
    root.unmount();
    container.remove();
  };

  return { waitForReady, rerender, unmount };
}

describe("usePublicationsActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeDefaultParams(overrides: Partial<HookParams> = {}) {
    let deleting = new Set<string>();
    let confirmPath: string | null = null;
    let lastError: string | null = null;
    let lastItems: EnrichedItem[] | null = [];
    let creating = false;
    let formError: string | null = null;

    const params = {
      items: [] as EnrichedItem[] | null,
      setItems: vi.fn((v: EnrichedItem[] | null) => {
        lastItems = v;
      }),
      setError: vi.fn((e: string | null) => {
        lastError = e;
      }),
      setCreating: vi.fn((v: boolean) => {
        creating = v;
      }),
      setAddOpen: vi.fn(),
      resetAddForm: vi.fn(),

      formTitle: "",
      formContent: "",
      formDate: "",
      formUrl: "",
      formAuthors: "",
      formVenue: "",

      editId: null as string | null,
      setFormError: vi.fn((m: string | null) => {
        formError = m;
      }),

      setDeleting: vi.fn((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
        if (typeof updater === "function") {
          deleting = updater(deleting);
        } else {
          deleting = updater;
        }
      }),
      setConfirmPath: vi.fn((v: string | null) => {
        confirmPath = v;
      }),

      searchQuery: "",
    };

    Object.assign(params, overrides);

    return {
      params,
      get state() {
        return { deleting, confirmPath, lastError, lastItems, creating, formError };
      },
    };
  }

  it("filters by search and sorts by date desc via paged", async () => {
    const items: EnrichedItem[] = [
      {
        url: "u1",
        pathname: "/a.json",
        detail: { title: "Alpha", content: "x", date: "2023-01-01", publicationUrl: "https://a", authors: [], venue: "v" },
      },
      {
        url: "u2",
        pathname: "/b.json",
        detail: { title: "beta item", content: "y", date: "2024-05-01", publicationUrl: "https://b", authors: [], venue: "v" },
      },
      {
        url: "u3",
        pathname: "/c.json",
        detail: { title: "Gamma", content: "z", date: "", publicationUrl: "https://c", authors: [], venue: "v" },
      },
    ];

    const { params } = makeDefaultParams({ items, searchQuery: "beta" });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    // with mock pagination, `paged` equals filtered list
    expect(api.paged).toHaveLength(1);
    expect(api.paged[0].pathname).toBe("/b.json");

    // without search, should be sorted by date desc (2024, 2023, then no date)
    const r2 = renderHook({ ...params, searchQuery: "" });
    const api2 = await r2.waitForReady();
    expect(api2.paged.map((i) => i.pathname)).toEqual(["/b.json", "/a.json", "/c.json"]);

    unmount();
    r2.unmount();
  });

  it("refresh loads items and handles errors", async () => {
    const enriched: EnrichedItem[] = [
      { url: "u", pathname: "/x.json", detail: { title: "T", content: "c", date: "2023-01-01", publicationUrl: "https://x", authors: [], venue: "v" } },
    ];

    const ctx = makeDefaultParams();
    const { params } = ctx;
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const mocked = vi.mocked(publicationsController);
    mocked.fetchPublications.mockResolvedValueOnce(enriched as unknown as EnrichedItem[]);
    await api.refresh();

    expect(params.setError).toHaveBeenCalledWith(null);
    expect(params.setItems).toHaveBeenCalledWith(null);
    expect(params.setItems).toHaveBeenLastCalledWith(enriched);

    // failure path
    mocked.fetchPublications.mockRejectedValueOnce(new Error("boom"));
    await api.refresh();
    expect(params.setError).toHaveBeenLastCalledWith("boom");
    // items were cleared at the start of refresh() before the failure
    expect(ctx.state.lastItems).toEqual(null);

    unmount();
  });

  it("handlePublicationFormSubmit validates required fields and URL", async () => {
    const { params } = makeDefaultParams({
      formTitle: "",
      formContent: "",
      formDate: "",
      formUrl: "",
      formAuthors: "",
      formVenue: "",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handlePublicationFormSubmit(evt);
    expect(params.setFormError).toHaveBeenCalledWith("Please fill in all required fields.");
    expect(publicationsController.createPublication).not.toHaveBeenCalled();
    expect(publicationsController.putPublication).not.toHaveBeenCalled();

    // Invalid URL
    const p2 = makeDefaultParams({
      formTitle: "T",
      formContent: "Body",
      formDate: "2024-01-01",
      formUrl: "invalid url",
      formAuthors: "Alice, Bob",
      formVenue: "Venue",
    });
    const r2 = renderHook(p2.params);
    const api2 = await r2.waitForReady();
    await api2.handlePublicationFormSubmit(evt);
    expect(p2.params.setFormError).toHaveBeenLastCalledWith(
      "Please enter a valid URL (e.g., https://example.com)"
    );
    r2.unmount();

    unmount();
  });

  it("creates a publication with normalized content/authors and closes modal", async () => {
    const { params } = makeDefaultParams({
      formTitle: "My Title",
      formContent: " First para \n\n Second para \n\n\n Third ",
      formDate: "2024-02-02",
      formUrl: "example.com/page",
      formAuthors: " Alice , Bob,,  Charlie ",
      formVenue: "Journal",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const mocked = vi.mocked(publicationsController);
    mocked.fetchPublications.mockResolvedValueOnce([] as unknown as EnrichedItem[]);
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handlePublicationFormSubmit(evt);

    expect(params.setCreating).toHaveBeenCalledWith(true);
    expect(publicationsController.putPublication).not.toHaveBeenCalled();
    const expectedPayload = {
      title: "My Title",
      content: ["First para", "Second para", "Third"],
      date: "2024-02-02",
      publicationUrl: "https://example.com/page",
      authors: ["Alice", "Bob", "Charlie"],
      venue: "Journal",
    } as const;
    expect(publicationsController.createPublication).toHaveBeenCalledWith(expectedPayload);
    expect(params.setAddOpen).toHaveBeenCalledWith(false);
    expect(params.resetAddForm).toHaveBeenCalled();
    expect(params.setCreating).toHaveBeenLastCalledWith(false);

    unmount();
  });

  it("creates publication with fallback content when normalization yields empty", async () => {
    const { params } = makeDefaultParams({
      formTitle: "Empty Content",
      formContent: " \n  \n ", // normalizeContent => [] -> fallback to [trimmed]
      formDate: "2024-02-02",
      formUrl: "https://example.com",
      formAuthors: "A,B",
      formVenue: "J",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();
    const mocked = vi.mocked(publicationsController);
    mocked.fetchPublications.mockResolvedValueOnce([] as unknown as EnrichedItem[]);
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handlePublicationFormSubmit(evt);
    expect(publicationsController.createPublication).toHaveBeenCalledWith({
      title: "Empty Content",
      content: [""],
      date: "2024-02-02",
      publicationUrl: "https://example.com",
      authors: ["A", "B"],
      venue: "J",
    });
    unmount();
  });

  it("sets default messages on non-Error failures (refresh/save/delete)", async () => {
    const ctx = makeDefaultParams({
      formTitle: "T",
      formContent: "Body",
      formDate: "2024-01-01",
      formUrl: "https://ex.com",
      formAuthors: "A,B",
      formVenue: "V",
    });
    const { params } = ctx;
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();
    const mocked = vi.mocked(publicationsController);

    // refresh non-Error rejection
    mocked.fetchPublications.mockRejectedValueOnce("bad");
    await api.refresh();
    expect(params.setError).toHaveBeenLastCalledWith("Failed to refresh");

    // save non-Error rejection
    mocked.createPublication.mockRejectedValueOnce("bad");
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handlePublicationFormSubmit(evt);
    expect(params.setFormError).toHaveBeenLastCalledWith("Failed to save publication");

    // delete non-Error rejection
    mocked.deletePublication.mockRejectedValueOnce("nope");
    await api.handleDelete("/x.json");
    expect(params.setError).toHaveBeenLastCalledWith("Failed to delete");

    unmount();
  });

  it("sets deleting state while delete is in-flight and removes after", async () => {
    const ctx = makeDefaultParams();
    const { params } = ctx;
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();
    const mocked = vi.mocked(publicationsController);

    // create a deferred promise without non-null assertion
    const resolveRef: { fn: () => void } = { fn: () => {} };
    const pending = new Promise<void>((r) => { resolveRef.fn = r; });
    mocked.deletePublication.mockReturnValueOnce(pending);
    mocked.fetchPublications.mockResolvedValueOnce([] as unknown as EnrichedItem[]);

    const path = "/pending.json";
    const p = api.handleDelete(path);
    // during in-flight
    expect(ctx.state.deleting.has(path)).toBe(true);
    // finish
    resolveRef.fn();
    await p;
    expect(ctx.state.deleting.has(path)).toBe(false);
    unmount();
  });

  it("updates a publication when editId is provided", async () => {
    const { params } = makeDefaultParams({
      formTitle: "T",
      formContent: "Body",
      formDate: "2024-03-03",
      formUrl: "https://example.org",
      formAuthors: "A,B",
      formVenue: "Conf",
      editId: "file.json",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const mocked = vi.mocked(publicationsController);
    mocked.fetchPublications.mockResolvedValueOnce([] as unknown as EnrichedItem[]);
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handlePublicationFormSubmit(evt);

    expect(publicationsController.putPublication).toHaveBeenCalledTimes(1);
    expect(publicationsController.putPublication).toHaveBeenCalledWith(
      "file.json",
      {
        title: "T",
        content: ["Body"],
        date: "2024-03-03",
        publicationUrl: "https://example.org",
        authors: ["A", "B"],
        venue: "Conf",
      }
    );
    expect(params.setAddOpen).toHaveBeenCalledWith(false);
    expect(params.resetAddForm).toHaveBeenCalled();

    unmount();
  });

  it("sets form error when save fails and stops further actions", async () => {
    const { params } = makeDefaultParams({
      formTitle: "T",
      formContent: "Body",
      formDate: "2024-01-01",
      formUrl: "https://ex.com",
      formAuthors: "A,B",
      formVenue: "V",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const mocked = vi.mocked(publicationsController);
    mocked.createPublication.mockRejectedValueOnce(new Error("server error"));
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handlePublicationFormSubmit(evt);

    expect(params.setFormError).toHaveBeenCalledWith("server error");
    // Should not close modal or reset form on failure
    expect(params.setAddOpen).not.toHaveBeenCalled();
    expect(params.resetAddForm).not.toHaveBeenCalled();
    expect(params.setCreating).toHaveBeenLastCalledWith(false);

    unmount();
  });

  it("handleDelete deletes by filename, refreshes list, and cleans up state", async () => {
    const ctx2 = makeDefaultParams();
    const { params: params2 } = ctx2;
    const mocked = vi.mocked(publicationsController);
    mocked.fetchPublications.mockResolvedValueOnce([{ url: "u", pathname: "/y.json" }] as unknown as EnrichedItem[]);
    const { waitForReady, unmount } = renderHook(params2);
    const api = await waitForReady();

    mocked.deletePublication.mockResolvedValueOnce(undefined);
    await api.handleDelete("/foo/bar/test%20file.json");

    // Called with last path segment decoded
    expect(publicationsController.deletePublication).toHaveBeenCalledWith("test file.json");
    expect(publicationsController.fetchPublications).toHaveBeenCalled();
    expect(params2.setItems).toHaveBeenCalled();
    expect(ctx2.state.deleting.has("/foo/bar/test%20file.json")).toBe(false);
    expect(params2.setConfirmPath).toHaveBeenCalledWith(null);

    unmount();
  });

  it("handleDelete sets error on failure and still cleans up", async () => {
    const ctx3 = makeDefaultParams();
    const { params: params3 } = ctx3;
    const { waitForReady, unmount } = renderHook(params3);
    const api = await waitForReady();

    const mocked = vi.mocked(publicationsController);
    mocked.deletePublication.mockRejectedValueOnce(new Error("nope"));
    await api.handleDelete("/file.json");

    expect(params3.setError).toHaveBeenCalledWith("nope");
    expect(ctx3.state.deleting.size).toBe(0);
    expect(params3.setConfirmPath).toHaveBeenCalledWith(null);

    unmount();
  });
});
