import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// Where the brokerage report markdown files live. Override with CONTENT_DIR so a
// Docker volume of .md files can be mounted without rebuilding the image.
export const CONTENT_DIR =
  process.env.CONTENT_DIR || path.join(process.cwd(), 'content', 'reports');

export type AppArea = 'Smartphone' | 'Humanoid' | 'Auto' | string;

export interface Report {
  slug: string;
  title: string;
  app: AppArea;
  category: string;
  author: string;
  role?: string;
  date: string; // YYYY-MM-DD (or any display string)
  views: number;
  summary: string;
  tags: string[];
  hero: boolean;
  heroTitle?: string;
  heroBody?: string;
  heroBg?: string;
  featured: boolean;
  content: string; // markdown body
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    // accept "12.4K" / "12400" / "12,400"
    const m = v.trim().match(/^([\d.,]+)\s*([kKmM]?)$/);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (m[2].toLowerCase() === 'k') return Math.round(n * 1000);
      if (m[2].toLowerCase() === 'm') return Math.round(n * 1_000_000);
      return Math.round(n);
    }
  }
  return 0;
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' && v.trim()) {
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseFile(filePath: string, slug: string): Report | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
    const app: AppArea = (data.app || data.category || 'Etc') as string;
    return {
      slug,
      title: String(data.title || slug),
      app,
      category: String(data.category || app),
      author: String(data.author || '리서치센터'),
      role: data.role ? String(data.role) : undefined,
      date: String(data.date || ''),
      views: toNumber(data.views),
      summary: String(data.summary || ''),
      tags: toStringArray(data.tags),
      hero: Boolean(data.hero),
      heroTitle: data.heroTitle ? String(data.heroTitle) : undefined,
      heroBody: data.heroBody ? String(data.heroBody) : undefined,
      heroBg: data.heroBg ? String(data.heroBg) : undefined,
      featured: Boolean(data.featured),
      content: content.trim(),
    };
  } catch {
    return null;
  }
}

/** All reports, newest first. Read fresh from disk on every call. */
export function getAllReports(): Report[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(CONTENT_DIR).filter((f) => /\.mdx?$/.test(f));
  } catch {
    return [];
  }
  const reports = files
    .map((f) => parseFile(path.join(CONTENT_DIR, f), f.replace(/\.mdx?$/, '')))
    .filter((r): r is Report => r !== null);
  reports.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return reports;
}

export function getReport(slug: string): Report | null {
  for (const ext of ['.md', '.mdx']) {
    const p = path.join(CONTENT_DIR, slug + ext);
    if (fs.existsSync(p)) return parseFile(p, slug);
  }
  return null;
}

export function getHeroReports(): Report[] {
  const heroes = getAllReports().filter((r) => r.hero);
  return heroes.length ? heroes : getAllReports().slice(0, 4);
}

export function getFeaturedReports(): Report[] {
  const featured = getAllReports().filter((r) => r.featured);
  return featured.length ? featured : getAllReports().slice(0, 8);
}

/** Top reports by views, for the "많이 본 리포트" ranking. */
export function getRanking(limit = 5): Report[] {
  return [...getAllReports()].sort((a, b) => b.views - a.views).slice(0, limit);
}

/** Distinct application areas present in the content, for filter chips. */
export function getAppAreas(): string[] {
  const seen = new Set<string>();
  for (const r of getAllReports()) seen.add(r.app);
  // Keep a stable, sensible order for the known areas.
  const order = ['Smartphone', 'Humanoid', 'Auto'];
  const known = order.filter((a) => seen.has(a));
  const extra = [...seen].filter((a) => !order.includes(a)).sort();
  return [...known, ...extra];
}
