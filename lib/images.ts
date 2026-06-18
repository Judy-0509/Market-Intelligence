// Placeholder gradient thumbnails per application area — deterministic by slug so
// server and client render the same value (no hydration mismatch). Replace with
// real images by adding a `thumbnail`/`bg` field to a report's frontmatter later.

const HUES: Record<string, number[]> = {
  Smartphone: [212, 228, 200, 240],
  Humanoid: [268, 300, 244, 320],
  Auto: [205, 196, 215, 188],
};

const DEFAULT_HUES = [210, 200, 220, 195];

function pool(hues: number[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < 20; i++) {
    const h = hues[i % hues.length] + ((i * 9) % 26) - 13;
    const ang = 115 + ((i * 23) % 90);
    const sat = 26 + ((i * 7) % 16);
    out.push(
      `linear-gradient(${ang}deg, hsl(${h} ${sat}% 30%), hsl(${h + 14} ${sat + 6}% 11%))`,
    );
  }
  return out;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function thumbnailFor(app: string, slug: string): string {
  const p = pool(HUES[app] || DEFAULT_HUES);
  return p[hash(slug) % p.length];
}

export function heroBackgroundFor(app: string, slug: string): string {
  // A darker, radial treatment for hero slides.
  const hues = HUES[app] || DEFAULT_HUES;
  const h = hues[hash(slug) % hues.length];
  return `radial-gradient(circle at 78% 42%, hsl(${h} 28% 22%) 0%, hsl(${h} 32% 11%) 42%, hsl(${h} 40% 6%) 82%)`;
}
