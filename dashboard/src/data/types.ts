// Payload shape mirroring the future DB export (pipeline/ -> SQLite -> this UI).
// The in-house Python script injects a value matching this shape into
// window.__TAM_DATA__ (see index.html injection seam). Keep this file in
// sync with the DB export contract when Phase 1 output stabilizes.
//
// v2: forecasts from MULTIPLE sources (내부 S.LSI + 관계사 + 조사기관) now sit
// side-by-side in one table. This is a breaking change from v1 (single
// implicit source) — there are no producers yet, so no compatibility shim.

/** One forecast vintage, e.g. the "6월 연전망" (June forecast) run. */
export type TamVintage = {
  /** Stable key used to index TamRow.blocks[sourceId], e.g. "2026-06". */
  id: string
  /** Display label, e.g. "6월 연전망". */
  label: string
}

/** Where a forecast source comes from, drives the header tint + legend. */
export type TamSourceKind = "internal" | "affiliate" | "research"

/** One forecast source, e.g. S.LSI, an affiliate, or a research firm. */
export type TamSource = {
  /** Stable key used to index TamRow.blocks / TamRow.mom, e.g. "slsi". */
  id: string
  /** Display label, e.g. "S.LSI", "관계사 A", "Omdia". */
  label: string
  kind: TamSourceKind
  /** This source's vintages, ascending (oldest first). At least one. */
  vintages: TamVintage[]
}

/** A vendor/group's forecast numbers for a single (source, vintage). */
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
  /** Baseline '25 shipments — one shared column across all sources, as in tam.xlsx. */
  y25: number | null
  /**
   * Per-source, per-vintage forecast blocks: blocks[sourceId][vintageId].
   * A missing (source, vintage) entry — the source key absent, or present
   * but without that vintage id — renders as "–" for that row/source/vintage;
   * it does NOT null out the row's other sources or the source's other rows.
   */
  blocks: Record<string, Record<string, TamBlock>>
  /**
   * Latest-minus-previous-vintage delta, per source. PRODUCER-computed: the
   * UI renders it as-is and never recomputes or validates the vintage pair.
   * null (or the source key absent) = no 전월비 column pair for that source
   * — the natural state when a source has fewer than 2 vintages.
   */
  mom: Record<string, TamMom | null>
}

export type TamData = {
  /** ISO timestamp of when this payload was generated. */
  generated_at: string
  /** Unit label for all shipment figures, e.g. "백만 대". */
  unit: string
  /** Baseline year the y25 column reports, e.g. 2025. */
  baseline_year: number
  /** Forecast sources, ordered: internal -> affiliate -> research. */
  sources: TamSource[]
  rows: TamRow[]
}
