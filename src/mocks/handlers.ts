import { http, HttpResponse, delay } from "msw";

type ProjectDetail = {
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  partner: { name: string; url: string };
};

type PublicationDetail = {
  title: string;
  content: string | string[];
  date: string; // YYYY-MM-DD
  publicationUrl: string;
  authors: string[];
  venue: string;
};

type ProjectItem = { filename: string; pathname: string; detail: ProjectDetail };
type PublicationItem = { filename: string; pathname: string; detail: PublicationDetail };

const apiDelayMs = 300;

const projects: ProjectItem[] = [
  {
    filename: "neural-shapes.json",
    pathname: "/projects/neural-shapes.json",
    detail: {
      title: "Neural Shape Reconstruction",
      content: "Reconstructing shapes from sparse views using neural fields.",
      date: "2024-06-12",
      partner: { name: "ACME Labs", url: "https://acme.example.com" },
    },
  },
  {
    filename: "procedural-meshes.json",
    pathname: "/projects/procedural-meshes.json",
    detail: {
      title: "Procedural Mesh Generation",
      content: "Grammar-based generation of high-fidelity meshes.",
      date: "2023-11-01",
      partner: { name: "PolyWorks", url: "https://polyworks.example.com" },
    },
  },
];

const publications: PublicationItem[] = [
  {
    filename: "sdf-tracing.json",
    pathname: "/publications/sdf-tracing.json",
    detail: {
      title: "Fast SDF Ray Tracing",
      content: [
        "We present a method for real-time SDF rendering.",
        "Benchmarks show 2x speedup over prior work.",
      ],
      date: "2024-03-21",
      publicationUrl: "https://arxiv.org/abs/2403.12345",
      authors: ["J. Doe", "A. Smith"],
      venue: "SIGGRAPH",
    },
  },
  {
    filename: "mesh-simplification.json",
    pathname: "/publications/mesh-simplification.json",
    detail: {
      title: "Topology-Preserving Mesh Simplification",
      content: "A robust approach to simplifying large meshes while preserving topology.",
      date: "2022-09-10",
      publicationUrl: "https://doi.org/10.1000/xyz123",
      authors: ["L. Zhang"],
      venue: "Eurographics",
    },
  },
];

const baseUrl = () => new URL("/", location.origin);
const projectDetailUrl = (filename: string) =>
  new URL(`/api/projects/detail/${filename}`, baseUrl()).toString();
const publicationDetailUrl = (filename: string) =>
  new URL(`/api/publications/detail/${filename}`, baseUrl()).toString();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export const handlers = [
  // Projects: list (REST style at /api/projects/)
  http.get("*/api/projects/", async () => {
    await delay(apiDelayMs);
    const items = projects.map((p) => ({
      url: projectDetailUrl(p.filename),
      pathname: p.pathname,
    }));
    return HttpResponse.json(items);
  }),

  // Projects: detail by filename
  http.get("*/api/projects/detail/:filename", async ({ params }) => {
    await delay(apiDelayMs);
    const filename = String(params.filename || "");
    const item = projects.find((p) => p.filename === filename);
    if (!item) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(item.detail);
  }),

  // Projects: delete (REST)
  http.delete("*/api/projects/:filename", async ({ params }) => {
    await delay(apiDelayMs);
    const filename = String(params.filename || "");
    const idx = projects.findIndex((p) => p.filename === filename);
    if (idx === -1) return HttpResponse.json({ message: "not found" }, { status: 404 });
    projects.splice(idx, 1);
    return HttpResponse.json({ ok: true, deleted: filename });
  }),

  // Projects: upload (REST)
  http.post("*/api/projects/", async ({ request }) => {
    await delay(apiDelayMs);
    type Payload = {
      title: string;
      content: string | string[];
      date: string;
      partner: { name: string; url: string };
    };
    const body = (await request.json()) as Partial<Payload>;
    const title = typeof body.title === "string" ? body.title : "";
    const date = typeof body.date === "string" ? body.date : "";
    const contentRaw = body.content;
    const partnerRec = body.partner ?? { name: "", url: "" };
    const partner = {
      name: typeof partnerRec?.name === "string" ? partnerRec.name : "",
      url: typeof partnerRec?.url === "string" ? partnerRec.url : "",
    };
    if (!title) return HttpResponse.json({ message: "title required" }, { status: 400 });
    const filename = `${slugify(title) || "untitled"}.json`;
    const detail: ProjectDetail = {
      title,
      content: Array.isArray(contentRaw)
        ? contentRaw.filter((p): p is string => typeof p === "string").join("\n\n")
        : String(contentRaw ?? ""),
      date,
      partner,
    };
    projects.unshift({ filename, pathname: `/projects/${filename}`, detail });
    return HttpResponse.json({ ok: true, created: { filename } });
  }),

  // Projects: update (REST)
  http.put("*/api/projects/:filename", async ({ params, request }) => {
    await delay(apiDelayMs);
    const filename = String(params.filename || "");
    const idx = projects.findIndex((p) => p.filename === filename);
    if (idx === -1) return HttpResponse.json({ message: "not found" }, { status: 404 });
    type Payload = { title: string; content: string | string[]; date: string; partner: { name: string; url: string } };
    const body = (await request.json()) as { contents?: string; contentType?: string };
    let parsed: Partial<Payload> = {};
    try { parsed = body.contents ? (JSON.parse(body.contents) as Payload) : {}; } catch { parsed = {}; }
    const title = typeof parsed.title === "string" ? parsed.title : projects[idx].detail.title;
    const date = typeof parsed.date === "string" ? parsed.date : projects[idx].detail.date;
    const partner = {
      name: typeof parsed.partner?.name === "string" ? parsed.partner.name : projects[idx].detail.partner.name,
      url: typeof parsed.partner?.url === "string" ? parsed.partner.url : projects[idx].detail.partner.url,
    };
    const content = Array.isArray(parsed.content)
      ? parsed.content.filter((p): p is string => typeof p === "string").join("\n\n")
      : typeof parsed.content === "string"
      ? parsed.content
      : projects[idx].detail.content;
    projects[idx].detail = { title, content, date, partner };
    return HttpResponse.json({ ok: true, blob: { pathname: projects[idx].pathname } });
  }),

  // Publications: list (REST)
  http.get("*/api/publications/", async () => {
    await delay(apiDelayMs);
    const items = publications.map((p) => ({
      url: publicationDetailUrl(p.filename),
      pathname: p.pathname,
    }));
    return HttpResponse.json(items);
  }),

  // Publications: detail by filename
  http.get("*/api/publications/detail/:filename", async ({ params }) => {
    await delay(apiDelayMs);
    const filename = String(params.filename || "");
    const item = publications.find((p) => p.filename === filename);
    if (!item) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(item.detail);
  }),

  // Publications: delete (REST)
  http.delete("*/api/publications/:filename", async ({ params }) => {
    await delay(apiDelayMs);
    const filename = String(params.filename || "");
    const idx = publications.findIndex((p) => p.filename === filename);
    if (idx === -1) return HttpResponse.json({ message: "not found" }, { status: 404 });
    publications.splice(idx, 1);
    return HttpResponse.json({ ok: true, deleted: filename });
  }),

  // Publications: upload (REST)
  http.post("*/api/publications/", async ({ request }) => {
    await delay(apiDelayMs);
    type Payload = {
      title: string;
      content: string | string[];
      date: string;
      publicationUrl: string;
      authors: string[];
      venue: string;
    };
    const body = (await request.json()) as Partial<Payload>;
    const title = typeof body.title === "string" ? body.title : "";
    const date = typeof body.date === "string" ? body.date : "";
    const publicationUrl = typeof body.publicationUrl === "string" ? body.publicationUrl : "";
    const authors = Array.isArray(body.authors)
      ? body.authors.filter((a): a is string => typeof a === "string")
      : [];
    const venue = typeof body.venue === "string" ? body.venue : "";
    const content: string | string[] = Array.isArray(body.content)
      ? body.content.filter((c): c is string => typeof c === "string")
      : typeof body.content === "string"
      ? body.content
      : "";
    if (!title) return HttpResponse.json({ message: "title required" }, { status: 400 });
    const filename = `${slugify(title) || "untitled"}.json`;
    const detail: PublicationDetail = { title, content, date, publicationUrl, authors, venue };
    publications.unshift({ filename, pathname: `/publications/${filename}`, detail });
    return HttpResponse.json({ ok: true, created: { filename } });
  }),

  // Publications: update (REST)
  http.put("*/api/publications/:filename", async ({ params, request }) => {
    await delay(apiDelayMs);
    const filename = String(params.filename || "");
    const idx = publications.findIndex((p) => p.filename === filename);
    if (idx === -1) return HttpResponse.json({ message: "not found" }, { status: 404 });
    type Payload = { title: string; content: string | string[]; date: string; publicationUrl: string; authors: string[]; venue: string };
    const body = (await request.json()) as { contents?: string; contentType?: string };
    let parsed: Partial<Payload> = {};
    try { parsed = body.contents ? (JSON.parse(body.contents) as Payload) : {}; } catch { parsed = {}; }
    const prev = publications[idx].detail;
    const title = typeof parsed.title === "string" ? parsed.title : prev.title;
    const date = typeof parsed.date === "string" ? parsed.date : prev.date;
    const publicationUrl = typeof parsed.publicationUrl === "string" ? parsed.publicationUrl : prev.publicationUrl;
    const authors = Array.isArray(parsed.authors) ? parsed.authors.filter((a): a is string => typeof a === "string") : prev.authors;
    const venue = typeof parsed.venue === "string" ? parsed.venue : prev.venue;
    const content = Array.isArray(parsed.content) || typeof parsed.content === "string" ? parsed.content! : prev.content;
    publications[idx].detail = { title, content, date, publicationUrl, authors, venue };
    return HttpResponse.json({ ok: true, blob: { pathname: publications[idx].pathname } });
  }),
];
