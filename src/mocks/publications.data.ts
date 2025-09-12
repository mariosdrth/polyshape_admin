// Mock publications data and simple generator

type PublicationDetail = {
  title: string;
  content: string | string[];
  date: string; // YYYY-MM-DD
  publicationUrl: string;
  authors: string[];
  venue: string;
};

type PublicationItem = { filename: string; pathname: string; detail: PublicationDetail };

export const basePublications: PublicationItem[] = [
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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateMinusDays(iso: string, days: number): string {
  const t = Date.parse(iso);
  if (isNaN(t)) return iso;
  const d = new Date(t);
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

export function makePublications(count: number): PublicationItem[] {
  const out: PublicationItem[] = [];
  // Always start with the base items (up to requested count)
  for (let i = 0; i < Math.min(basePublications.length, count); i++) {
    out.push(basePublications[i]);
  }
  if (count <= out.length) return out.slice(0, count);

  // Use the first base as a template for additional items
  const template = basePublications[0];
  for (let i = out.length; i < count; i++) {
    const n = i + 1; // 1-based suffix for readability
    const baseName = template.filename.replace(/\.json$/i, "");
    const filename = `${baseName}-${n}.json`;
    const pathname = `/publications/${filename}`;
    const detail: PublicationDetail = {
      title: `${template.detail.title} ${n}`,
      content: Array.isArray(template.detail.content)
        ? template.detail.content.map((p) => `${p} ${n}`)
        : `${template.detail.content} ${n}`,
      date: dateMinusDays(template.detail.date, n),
      publicationUrl: `${template.detail.publicationUrl}?n=${n}`,
      authors: template.detail.authors.map((a) => `${a} ${n}`),
      venue: `${template.detail.venue} ${n}`,
    };
    out.push({ filename, pathname, detail });
  }
  return out;
}

