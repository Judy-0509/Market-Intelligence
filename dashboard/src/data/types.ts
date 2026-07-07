// Payload shape mirroring the future DB export (pipeline/ -> SQLite -> this UI).
// The in-house Python script injects a value matching this shape into
// window.__TAM_DATA__ (see index.html injection seam). Keep this file in
// sync with the DB export contract when Phase 1 output stabilizes.

/** One forecast vintage, e.g. the "6월 연전망" (June forecast) run. */
export type TamVintage = {
  /** Stable key used to index TamRow.blocks, e.g. "2026-06". */
  id: string
  /** Display label, e.g. "6월 연전망". */
  label: string
}

/** A vendor/group's forecast numbers for a single vintage. */
export type TamBlock = {
  /** Forecast unit shipments for the baseline+1 year (e.g. '26). */
  y26: number | null
  /** Forecast unit shipments for the baseline+2 year (e.g. '27). */
  y27: number | null
  /** Year-over-year ratio for y26 vs. the '25 baseline, e.g. 0.083 = +8.3%. */
  yoy26: number | null
  /** Year-over-year ratio for y27 vs. y26. */
  yoy27: number | null
}

/** Month-over-month delta (latest vintage minus previous), absolute units. */
export type TamMom = {
  y26: number | null
  y27: number | null
}

export type TamRowKind = "total" | "group" | "member" | "vendor"

export type TamRow = {
  /** Display name, Korean-friendly (vendor, group, or "Total"). */
  vendor: string
  /** Total row / CN Total subtotal / CN Total's members / standalone vendor. */
  kind: TamRowKind
  /** Baseline '25 shipments. */
  y25: number | null
  /** Per-vintage forecast blocks, keyed by TamVintage.id. */
  blocks: Record<string, TamBlock>
  /** Latest-minus-previous-vintage delta; null when fewer than 2 vintages exist. */
  mom: TamMom | null
}

export type TamData = {
  /** ISO timestamp of when this payload was generated. */
  generated_at: string
  /** Unit label for all shipment figures, e.g. "백만 대". */
  unit: string
  /** Baseline year the y25 column reports, e.g. 2025. */
  baseline_year: number
  /** Forecast vintages in chronological order (oldest first). */
  vintages: TamVintage[]
  rows: TamRow[]
}
