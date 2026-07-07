// Number formatting for the TAM table. Uses en-US grouping (comma thousands,
// period decimal) since that convention is what analysts read numerals in
// regardless of the surrounding Korean UI labels.

const NULL_DISPLAY = "–"

/** "1,234.5" (1 decimal), or the null placeholder. */
export function formatNumber(value: number | null): string {
  if (value === null) return NULL_DISPLAY
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

/** "+8.3%" / "-2.1%" (1 decimal, explicit sign), or the null placeholder. */
export function formatYoy(value: number | null): string {
  if (value === null) return NULL_DISPLAY
  const pct = value * 100
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(1)}%`
}

/** "+12.3" / "-4.0" (signed absolute delta), or the null placeholder. */
export function formatMom(value: number | null): string {
  if (value === null) return NULL_DISPLAY
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}`
}

/**
 * Korean financial color convention: positive = red, negative = blue.
 * Uses theme tokens only (destructive for red, chart-2 for blue) so it
 * stays readable in both light and dark mode.
 */
export function momColorClassName(value: number | null): string {
  if (value === null || value === 0) return ""
  return value > 0 ? "text-destructive" : "text-chart-2"
}
