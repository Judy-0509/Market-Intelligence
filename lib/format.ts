/** 12400 -> "12.4K", 980 -> "980", 1200000 -> "1.2M" */
export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/** "2024-05-20" -> "2024.05.20" (leaves other formats untouched). */
export function formatDate(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : d;
}
