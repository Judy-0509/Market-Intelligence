// Number formatting for the TAM table. Uses en-US grouping (comma thousands,
// period decimal) since that convention is what analysts read numerals in
// regardless of the surrounding Korean UI labels.

import type { TamSourceKind } from "@/data/types"

const NULL_DISPLAY = "–"

/**
 * Round to the displayed precision (1 decimal), normalizing -0 to 0 so
 * near-zero negatives (e.g. -0.0001) never render as "-0.0" and sign/color
 * decisions match what the user actually sees.
 */
function roundToDisplayed(value: number): number {
  const rounded = Math.round(value * 10) / 10
  return rounded === 0 ? 0 : rounded // -0 === 0, so this also normalizes -0
}

/** "1,234.5" (1 decimal), or the null placeholder. */
export function formatNumber(value: number | null): string {
  if (value === null) return NULL_DISPLAY
  return roundToDisplayed(value).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

/** "+8.3%" / "-2.1%" (1 decimal, explicit sign), "0.0%" when it rounds to zero. */
export function formatYoy(value: number | null): string {
  if (value === null) return NULL_DISPLAY
  const pct = roundToDisplayed(value * 100)
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(1)}%`
}

/** "+12.3" / "-4.0" (signed absolute delta), "0.0" when it rounds to zero. */
export function formatMom(value: number | null): string {
  if (value === null) return NULL_DISPLAY
  const rounded = roundToDisplayed(value)
  const sign = rounded > 0 ? "+" : ""
  return `${sign}${rounded.toFixed(1)}`
}

/**
 * Korean financial color convention: positive = red, negative = blue.
 * Uses theme tokens only (destructive for red, chart-2 for blue) so it
 * stays readable in both light and dark mode.
 * The sign is judged at the DISPLAYED precision: a value that renders as
 * "0.0" (e.g. 0.04 or -0.0001) stays neutral instead of colored.
 */
export function momColorClassName(value: number | null): string {
  if (value === null) return ""
  const rounded = roundToDisplayed(value)
  if (rounded === 0) return ""
  return rounded > 0 ? "text-destructive" : "text-chart-2"
}

/**
 * Subtle kind-based tint for a source's row-1 group header, token-based so
 * it stays legible in both light and dark mode (no hex). This preset's
 * --muted/--accent happen to sit almost flush with the card background
 * (oklch 0.97 vs. 1), so a flat `bg-muted`/`bg-accent` wash is invisible —
 * these use `-foreground` tokens (which carry real contrast against card in
 * both themes) at low opacity for a true "tint", not a solid fill.
 */
export function sourceKindTintClassName(kind: TamSourceKind): string {
  switch (kind) {
    case "internal":
      return "bg-primary/12"
    case "affiliate":
      return "bg-muted-foreground/12"
    case "research":
      return "bg-accent-foreground/18"
  }
}
