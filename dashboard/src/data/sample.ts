import type {
  TamBlock,
  TamData,
  TamMom,
  TamRow,
  TamRowKind,
  TamSource,
  TamSourceKind,
} from "./types"

// Bundled sample payload used when window.__TAM_DATA__ is null (i.e. before
// the in-house Python script injects real DB-exported data). Numbers are
// illustrative but internally consistent: every derived figure (per-source
// YoY, CN Total, Total, MoM) is computed below from raw vendor inputs rather
// than hand-typed, so the sample can never drift out of consistency —
// including across sources, since non-S.LSI sources are deterministically
// derived from the S.LSI baseline (see `driftFactor`) rather than typed
// separately.

/** Raw per-vintage S.LSI forecast input for one vendor/member row. */
type RawVintageInput = { y26: number; y27: number }

/** Raw S.LSI forecast input for one row before derived figures are computed. */
type RawRowInput = {
  vendor: string
  kind: TamRowKind
  y25: number
  bySlsiVintage: Record<string, RawVintageInput>
}

const VINTAGE_LABELS: Record<string, string> = {
  "2026-06": "6월 연전망",
  "2026-07": "7월 연전망",
}

/** Source metadata driving derivation: which vintages it reports, how far
 * its numbers drift from S.LSI, and which vendor rows it has no coverage
 * for at all (blocks absent -> "–" cells). */
type SourceMeta = {
  id: string
  label: string
  kind: TamSourceKind
  vintageIds: string[]
  /** Deterministic drift vs. S.LSI, in percent. 0 for S.LSI itself. */
  driftPct: number
  excludeVendors?: string[]
}

const SOURCE_META: SourceMeta[] = [
  {
    id: "slsi",
    label: "S.LSI",
    kind: "internal",
    vintageIds: ["2026-06", "2026-07"],
    driftPct: 0,
  },
  {
    id: "affil-a",
    label: "관계사 A",
    kind: "affiliate",
    vintageIds: ["2026-07"],
    driftPct: 1.5,
  },
  {
    id: "omdia",
    label: "Omdia",
    kind: "research",
    vintageIds: ["2026-06", "2026-07"],
    driftPct: 2.5,
    excludeVendors: ["CN 기타", "기타"],
  },
  {
    id: "counterpoint",
    label: "Counterpoint",
    kind: "research",
    vintageIds: ["2026-07"],
    driftPct: 3.5,
    excludeVendors: ["CN 기타", "기타"],
  },
]

const MX: RawRowInput = {
  vendor: "MX",
  kind: "vendor",
  y25: 225.4,
  bySlsiVintage: {
    "2026-06": { y26: 228.1, y27: 231.9 },
    "2026-07": { y26: 229.8, y27: 233.2 },
  },
}

const APPLE: RawRowInput = {
  vendor: "Apple",
  kind: "vendor",
  y25: 229.8,
  bySlsiVintage: {
    "2026-06": { y26: 234.6, y27: 239.5 },
    "2026-07": { y26: 235.9, y27: 240.7 },
  },
}

const CN_MEMBERS: RawRowInput[] = [
  {
    vendor: "Huawei",
    kind: "member",
    y25: 44.6,
    bySlsiVintage: {
      "2026-06": { y26: 49.8, y27: 54.9 },
      "2026-07": { y26: 52.3, y27: 57.1 },
    },
  },
  {
    vendor: "Honor",
    kind: "member",
    y25: 54.9,
    bySlsiVintage: {
      "2026-06": { y26: 57.8, y27: 60.1 },
      "2026-07": { y26: 56.6, y27: 59.3 },
    },
  },
  {
    vendor: "Oppo",
    kind: "member",
    y25: 99.7,
    bySlsiVintage: {
      "2026-06": { y26: 102.9, y27: 106.4 },
      "2026-07": { y26: 104.1, y27: 107.2 },
    },
  },
  {
    vendor: "Vivo",
    kind: "member",
    y25: 100.3,
    bySlsiVintage: {
      "2026-06": { y26: 101.8, y27: 105.0 },
      "2026-07": { y26: 100.6, y27: 103.9 },
    },
  },
  {
    vendor: "Xiaomi",
    kind: "member",
    y25: 169.5,
    bySlsiVintage: {
      "2026-06": { y26: 178.2, y27: 185.4 },
      "2026-07": { y26: 181.3, y27: 189.0 },
    },
  },
  {
    vendor: "Lenovo",
    kind: "member",
    y25: 44.8,
    bySlsiVintage: {
      "2026-06": { y26: 45.9, y27: 47.2 },
      "2026-07": { y26: 44.7, y27: 46.1 },
    },
  },
  {
    vendor: "Transsion",
    kind: "member",
    y25: 99.9,
    bySlsiVintage: {
      "2026-06": { y26: 107.6, y27: 114.8 },
      "2026-07": { y26: 109.8, y27: 117.3 },
    },
  },
  {
    vendor: "CN 기타",
    kind: "member",
    y25: 15.3,
    bySlsiVintage: {
      "2026-06": { y26: 15.9, y27: 17.1 },
      "2026-07": { y26: 16.2, y27: 17.4 },
    },
  },
]

const GOOGLE: RawRowInput = {
  vendor: "Google",
  kind: "vendor",
  y25: 9.8,
  bySlsiVintage: {
    "2026-06": { y26: 10.9, y27: 12.1 },
    "2026-07": { y26: 11.1, y27: 12.3 },
  },
}

const OTHERS: RawRowInput = {
  vendor: "기타",
  kind: "vendor",
  y25: 104.9,
  bySlsiVintage: {
    "2026-06": { y26: 100.2, y27: 97.8 },
    "2026-07": { y26: 97.4, y27: 94.6 },
  },
}

/** Round to the sample's input precision (1 decimal), normalizing -0. */
function round1(value: number): number {
  const rounded = Math.round(value * 10) / 10
  return rounded === 0 ? 0 : rounded
}

/** YoY ratio, e.g. 0.083 means +8.3%. Null when either side is unusable. */
function yoy(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null || prev === 0) return null
  return curr / prev - 1
}

/** Deterministic pseudo-random unit value in [0, 1) from a string seed —
 * no Math.random, so cross-source drift is reproducible on every render
 * yet varies per (source, vendor) pair rather than being a flat multiplier. */
function seededUnit(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) | 0
  }
  return (((hash % 1000) + 1000) % 1000) / 1000
}

/** Deterministic per-vendor multiplier for a non-S.LSI source: within
 * +/-driftPct of 1.0, so "research firms a few % off S.LSI" holds without
 * hand-typing a single non-S.LSI figure. */
function driftFactor(sourceId: string, vendor: string, driftPct: number): number {
  if (driftPct === 0) return 1
  const unit = seededUnit(`${sourceId}:${vendor}`)
  return 1 + (unit * 2 - 1) * (driftPct / 100)
}

/** This source's raw y26/y27 for one vendor row at one vintage, or null when
 * the source has no coverage for this vendor (excludeVendors) or vintage. */
function forecastFor(
  row: RawRowInput,
  source: SourceMeta,
  vintageId: string
): RawVintageInput | null {
  if (source.excludeVendors?.includes(row.vendor)) return null
  const base = row.bySlsiVintage[vintageId]
  if (!base) return null
  const factor = driftFactor(source.id, row.vendor, source.driftPct)
  return { y26: round1(base.y26 * factor), y27: round1(base.y27 * factor) }
}

/** Sum of members' forecasts for this source/vintage, treating a member with
 * no coverage as a zero contribution (never nulls out the whole sum) — this
 * is how CN 합계/합계 stay populated for research firms that skip minor
 * categories, while still satisfying "CN 합계 = member sum". */
function sumForecast(
  members: RawRowInput[],
  source: SourceMeta,
  vintageId: string
): RawVintageInput {
  let y26 = 0
  let y27 = 0
  for (const m of members) {
    const f = forecastFor(m, source, vintageId)
    if (f) {
      y26 += f.y26
      y27 += f.y27
    }
  }
  return { y26: round1(y26), y27: round1(y27) }
}

function buildBlock(y25: number, raw: RawVintageInput | null): TamBlock | null {
  if (!raw) return null
  return {
    y26: raw.y26,
    y27: raw.y27,
    yoy26: yoy(raw.y26, y25),
    yoy27: yoy(raw.y27, raw.y26),
  }
}

/** Latest-minus-previous-vintage delta for one source. Null when the source
 * has fewer than 2 vintages, or either side is missing for this row. */
function buildMom(perVintage: Record<string, TamBlock>, vintageIds: string[]): TamMom | null {
  if (vintageIds.length < 2) return null
  const latest = perVintage[vintageIds[vintageIds.length - 1]]
  const previous = perVintage[vintageIds[vintageIds.length - 2]]
  if (!latest || !previous) return null
  return {
    y26: latest.y26 !== null && previous.y26 !== null ? round1(latest.y26 - previous.y26) : null,
    y27: latest.y27 !== null && previous.y27 !== null ? round1(latest.y27 - previous.y27) : null,
  }
}

/** Assemble one row's full blocks/mom across every source, given a provider
 * that returns this row's raw (source, vintage) forecast. */
function buildRow(
  vendor: string,
  kind: TamRowKind,
  y25: number,
  provider: (source: SourceMeta, vintageId: string) => RawVintageInput | null
): TamRow {
  const blocks: Record<string, Record<string, TamBlock>> = {}
  const mom: Record<string, TamMom | null> = {}
  for (const source of SOURCE_META) {
    const perVintage: Record<string, TamBlock> = {}
    for (const vintageId of source.vintageIds) {
      const block = buildBlock(y25, provider(source, vintageId))
      if (block) perVintage[vintageId] = block
    }
    blocks[source.id] = perVintage
    mom[source.id] = buildMom(perVintage, source.vintageIds)
  }
  return { vendor, kind, y25, blocks, mom }
}

const CN_TOTAL_Y25 = round1(CN_MEMBERS.reduce((sum, m) => sum + m.y25, 0))
const TOTAL_Y25 = round1(MX.y25 + APPLE.y25 + CN_TOTAL_Y25 + GOOGLE.y25 + OTHERS.y25)

const totalRow = buildRow("합계", "total", TOTAL_Y25, (source, vintageId) => {
  const mx = forecastFor(MX, source, vintageId)
  const apple = forecastFor(APPLE, source, vintageId)
  const cnTotal = sumForecast(CN_MEMBERS, source, vintageId)
  const google = forecastFor(GOOGLE, source, vintageId)
  const others = forecastFor(OTHERS, source, vintageId)
  return {
    y26: round1(
      (mx?.y26 ?? 0) + (apple?.y26 ?? 0) + cnTotal.y26 + (google?.y26 ?? 0) + (others?.y26 ?? 0)
    ),
    y27: round1(
      (mx?.y27 ?? 0) + (apple?.y27 ?? 0) + cnTotal.y27 + (google?.y27 ?? 0) + (others?.y27 ?? 0)
    ),
  }
})

const mxRow = buildRow(MX.vendor, MX.kind, MX.y25, (source, vintageId) =>
  forecastFor(MX, source, vintageId)
)
const appleRow = buildRow(APPLE.vendor, APPLE.kind, APPLE.y25, (source, vintageId) =>
  forecastFor(APPLE, source, vintageId)
)
const cnTotalRow = buildRow("CN 합계", "group", CN_TOTAL_Y25, (source, vintageId) =>
  sumForecast(CN_MEMBERS, source, vintageId)
)
const cnMemberRows = CN_MEMBERS.map((m) =>
  buildRow(m.vendor, m.kind, m.y25, (source, vintageId) => forecastFor(m, source, vintageId))
)
const googleRow = buildRow(GOOGLE.vendor, GOOGLE.kind, GOOGLE.y25, (source, vintageId) =>
  forecastFor(GOOGLE, source, vintageId)
)
const othersRow = buildRow(OTHERS.vendor, OTHERS.kind, OTHERS.y25, (source, vintageId) =>
  forecastFor(OTHERS, source, vintageId)
)

const sources: TamSource[] = SOURCE_META.map((meta) => ({
  id: meta.id,
  label: meta.label,
  kind: meta.kind,
  vintages: meta.vintageIds.map((id) => ({ id, label: VINTAGE_LABELS[id] })),
}))

export const sampleTamData: TamData = {
  generated_at: "2026-07-05T09:00:00+09:00",
  unit: "백만 대",
  baseline_year: 2025,
  sources,
  rows: [totalRow, mxRow, appleRow, cnTotalRow, ...cnMemberRows, googleRow, othersRow],
}
