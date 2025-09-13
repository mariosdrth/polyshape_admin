import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { useProjectsActions } from "../../src/components/projects/useProjectsActions";
import * as projectsController from "../../src/controllers/projectsController";

// Mock pagination util so `paged` equals filtered list without slicing
vi.mock("@polyutils/components", () => {
  return {
    usePagination: (items: unknown[], _pageSize: number) => {
      void _pageSize;
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
vi.mock("../../src/controllers/projectsController", async () => {
  return {
    fetchProjects: vi.fn(),
    createProject: vi.fn(),
    putProject: vi.fn(),
    deleteProject: vi.fn(),
  };
});

type EnrichedItem = projectsController.EnrichedItem;

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
  formPartnerName: string;
  formPartnerUrl: string;
  editId: string | null;
  setFormError: (msg: string | null) => void;
  setDeleting: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setConfirmPath: (v: string | null) => void;
  searchQuery: string;
};

function renderHook(params: HookParams) {
  let api: ReturnType<typeof useProjectsActions> | null = null;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const Harness: React.FC<{ params: HookParams }> = ({ params }) => {
    const res = useProjectsActions(params);
    api = res;
    return null;
  };

  root.render(React.createElement(Harness, { params }));

  const waitForReady = async () => {
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

describe("useProjectsActions", () => {
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

    const params: HookParams = {
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
      formPartnerName: "",
      formPartnerUrl: "",

      editId: null,
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
        detail: { title: "Alpha", content: "x", date: "2023-01-01", partner: { name: "p1", url: "https://a" } },
      },
      {
        url: "u2",
        pathname: "/b.json",
        detail: { title: "beta item", content: "y", date: "2024-05-01", partner: { name: "p2", url: "https://b" } },
      },
      {
        url: "u3",
        pathname: "/c.json",
        detail: { title: "Gamma", content: "z", date: "", partner: { name: "p3", url: "https://c" } },
      },
    ];

    const { params } = makeDefaultParams({ items, searchQuery: "beta" });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    expect(api.paged).toHaveLength(1);
    expect(api.paged[0].pathname).toBe("/b.json");

    const r2 = renderHook({ ...params, searchQuery: "" });
    const api2 = await r2.waitForReady();
    expect(api2.paged.map((i) => i.pathname)).toEqual(["/b.json", "/a.json", "/c.json"]);

    unmount();
    r2.unmount();
  });

  it("refresh loads items and handles errors", async () => {
    const enriched: EnrichedItem[] = [
      { url: "u", pathname: "/x.json", detail: { title: "T", content: "c", date: "2023-01-01", partner: { name: "x", url: "https://x" } } },
    ];

    const ctx = makeDefaultParams();
    const { params } = ctx;
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const mocked = vi.mocked(projectsController);
    mocked.fetchProjects.mockResolvedValueOnce(enriched as unknown as EnrichedItem[]);
    await api.refresh();

    expect(params.setError).toHaveBeenCalledWith(null);
    expect(params.setItems).toHaveBeenCalledWith(null);
    expect(params.setItems).toHaveBeenLastCalledWith(enriched);

    mocked.fetchProjects.mockRejectedValueOnce(new Error("boom"));
    await api.refresh();
    expect(params.setError).toHaveBeenLastCalledWith("boom");
    expect(ctx.state.lastItems).toEqual(null);

    unmount();
  });

  it("handleProjectFormSubmit validates required fields and URL", async () => {
    const { params } = makeDefaultParams({
      formTitle: "",
      formContent: "",
      formDate: "",
      formPartnerName: "",
      formPartnerUrl: "",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handleProjectFormSubmit(evt);
    expect(params.setFormError).toHaveBeenCalledWith("Please fill in all required fields.");
    expect(projectsController.createProject).not.toHaveBeenCalled();
    expect(projectsController.putProject).not.toHaveBeenCalled();

    const p2 = makeDefaultParams({
      formTitle: "T",
      formContent: "Body",
      formDate: "2024-01-01",
      formPartnerName: "Partner",
      formPartnerUrl: "invalid url",
    });
    const r2 = renderHook(p2.params);
    const api2 = await r2.waitForReady();
    await api2.handleProjectFormSubmit(evt);
    expect(p2.params.setFormError).toHaveBeenLastCalledWith(
      "Please enter a valid partner URL (e.g., https://example.com)"
    );
    r2.unmount();

    unmount();
  });

  it("creates a project with normalized content and closes modal", async () => {
    const { params } = makeDefaultParams({
      formTitle: "My Project",
      formContent: " First para \n\n Second para \n\n\n Third ",
      formDate: "2024-02-02",
      formPartnerName: "Org",
      formPartnerUrl: "example.com/page",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const mocked = vi.mocked(projectsController);
    mocked.fetchProjects.mockResolvedValueOnce([] as unknown as EnrichedItem[]);
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handleProjectFormSubmit(evt);

    expect(params.setCreating).toHaveBeenCalledWith(true);
    expect(projectsController.putProject).not.toHaveBeenCalled();
    expect(projectsController.createProject).toHaveBeenCalledWith({
      title: "My Project",
      content: ["First para", "Second para", "Third"],
      date: "2024-02-02",
      partner: { name: "Org", url: "https://example.com/page" },
    });
    expect(params.setAddOpen).toHaveBeenCalledWith(false);
    expect(params.resetAddForm).toHaveBeenCalled();
    expect(params.setCreating).toHaveBeenLastCalledWith(false);

    unmount();
  });

  it("creates project with fallback content when normalization yields empty", async () => {
    const { params } = makeDefaultParams({
      formTitle: "Empty Content",
      formContent: " \n  \n ",
      formDate: "2024-02-02",
      formPartnerName: "Org",
      formPartnerUrl: "https://example.com",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();
    const mocked = vi.mocked(projectsController);
    mocked.fetchProjects.mockResolvedValueOnce([] as unknown as EnrichedItem[]);
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handleProjectFormSubmit(evt);
    expect(projectsController.createProject).toHaveBeenCalledWith({
      title: "Empty Content",
      content: [""],
      date: "2024-02-02",
      partner: { name: "Org", url: "https://example.com" },
    });
    unmount();
  });

  it("sets default messages on non-Error failures (refresh/save/delete)", async () => {
    const ctx = makeDefaultParams({
      formTitle: "T",
      formContent: "Body",
      formDate: "2024-01-01",
      formPartnerName: "Org",
      formPartnerUrl: "https://ex.com",
    });
    const { params } = ctx;
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();
    const mocked = vi.mocked(projectsController);

    mocked.fetchProjects.mockRejectedValueOnce("bad");
    await api.refresh();
    expect(params.setError).toHaveBeenLastCalledWith("Failed to refresh");

    mocked.createProject.mockRejectedValueOnce("bad");
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handleProjectFormSubmit(evt);
    expect(params.setFormError).toHaveBeenLastCalledWith("Failed to save project");

    mocked.deleteProject.mockRejectedValueOnce("nope");
    await api.handleDelete("/x.json");
    expect(params.setError).toHaveBeenLastCalledWith("Failed to delete");

    unmount();
  });

  it("sets deleting state while delete is in-flight and removes after", async () => {
    const ctx = makeDefaultParams();
    const { params } = ctx;
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();
    const mocked = vi.mocked(projectsController);

    const resolveRef: { fn: () => void } = { fn: () => {} };
    const pending = new Promise<void>((r) => { resolveRef.fn = r; });
    mocked.deleteProject.mockReturnValueOnce(pending as unknown as Promise<{ ok: boolean; deleted: string }>);
    mocked.fetchProjects.mockResolvedValueOnce([] as unknown as EnrichedItem[]);

    const path = "/pending.json";
    const p = api.handleDelete(path);
    expect(ctx.state.deleting.has(path)).toBe(true);
    resolveRef.fn();
    await p;
    expect(ctx.state.deleting.has(path)).toBe(false);
    unmount();
  });

  it("updates a project when editId is provided", async () => {
    const { params } = makeDefaultParams({
      formTitle: "T",
      formContent: "Body",
      formDate: "2024-03-03",
      formPartnerName: "Org",
      formPartnerUrl: "https://example.org",
      editId: "file.json",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const mocked = vi.mocked(projectsController);
    mocked.fetchProjects.mockResolvedValueOnce([] as unknown as EnrichedItem[]);
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handleProjectFormSubmit(evt);

    expect(projectsController.putProject).toHaveBeenCalledWith("file.json", {
      title: "T",
      content: ["Body"],
      date: "2024-03-03",
      partner: { name: "Org", url: "https://example.org" },
    });
    expect(params.setAddOpen).toHaveBeenCalledWith(false);
    expect(params.resetAddForm).toHaveBeenCalled();

    unmount();
  });

  it("sets form error when save fails and stops further actions", async () => {
    const { params } = makeDefaultParams({
      formTitle: "T",
      formContent: "Body",
      formDate: "2024-01-01",
      formPartnerName: "Org",
      formPartnerUrl: "https://ex.com",
    });
    const { waitForReady, unmount } = renderHook(params);
    const api = await waitForReady();

    const mocked = vi.mocked(projectsController);
    mocked.createProject.mockRejectedValueOnce(new Error("server error"));
    const evt = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await api.handleProjectFormSubmit(evt);

    expect(params.setFormError).toHaveBeenCalledWith("server error");
    expect(params.setAddOpen).not.toHaveBeenCalled();
    expect(params.resetAddForm).not.toHaveBeenCalled();
    expect(params.setCreating).toHaveBeenLastCalledWith(false);

    unmount();
  });

  it("handleDelete deletes by filename, refreshes list, and cleans up state", async () => {
    const ctx2 = makeDefaultParams();
    const { params: params2 } = ctx2;
    const mocked = vi.mocked(projectsController);
    mocked.fetchProjects.mockResolvedValueOnce([{ url: "u", pathname: "/y.json" }] as unknown as EnrichedItem[]);
    const { waitForReady, unmount } = renderHook(params2);
    const api = await waitForReady();

    mocked.deleteProject.mockResolvedValueOnce({ ok: true, deleted: "file" });
    await api.handleDelete("/foo/bar/test%20file.json");

    expect(projectsController.deleteProject).toHaveBeenCalledWith("test file.json");
    expect(projectsController.fetchProjects).toHaveBeenCalled();
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

    const mocked = vi.mocked(projectsController);
    mocked.deleteProject.mockRejectedValueOnce(new Error("nope"));
    await api.handleDelete("/file.json");

    expect(params3.setError).toHaveBeenCalledWith("nope");
    expect(ctx3.state.deleting.size).toBe(0);
    expect(params3.setConfirmPath).toHaveBeenCalledWith(null);

    unmount();
  });
});
