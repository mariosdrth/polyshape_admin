// Mock projects data and simple generator

type ProjectDetail = {
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  partner: { name: string; url: string };
};

type ProjectItem = { filename: string; pathname: string; detail: ProjectDetail };

export const baseProjects: ProjectItem[] = [
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

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

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

export function makeProjects(count: number): ProjectItem[] {
  const out: ProjectItem[] = [];
  // Start with base items (up to requested count)
  for (let i = 0; i < Math.min(baseProjects.length, count); i++) out.push(baseProjects[i]);
  if (count <= out.length) return out.slice(0, count);

  const template = baseProjects[0];
  for (let i = out.length; i < count; i++) {
    const n = i + 1;
    const baseName = template.filename.replace(/\.json$/i, "");
    const filename = `${baseName}-${n}.json`;
    const pathname = `/projects/${filename}`;
    const detail: ProjectDetail = {
      title: `${template.detail.title} ${n}`,
      content: `${template.detail.content} ${n}`,
      date: dateMinusDays(template.detail.date, n),
      partner: {
        name: `${template.detail.partner.name} ${n}`,
        url: `${template.detail.partner.url}?n=${n}`,
      },
    };
    out.push({ filename, pathname, detail });
  }
  return out;
}

