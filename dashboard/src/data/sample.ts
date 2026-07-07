import type { TamBlock, TamData, TamMom, TamRow, TamRowKind, TamVintage } from "./types"

// Bundled sample payload used when window.__TAM_DATA__ is null (i.e. before
// the in-house Python script injects real DB-exported data). Numbers are
// illustrative but internally consistent: every derived figure (YoY ratios,
// CN Total, Total, MoM) is computed below from raw vendor inputs rather than
// hand-typed, so the sample can never drift out of consistency.

/** Raw per-vintage forecast input for one vendor/member row. */
type RawVintageInput = { y26: number; y27: number }

/** Raw forecast input for one row before derived figures are computed. */
type RawRowInput = {
  vendor: string
  kind: TamRowKind
  y25: number
  byVintage: Record<string, RawVintageInput>
}

const VINTAGES: TamVintage[] = [
  { id: "2026-06", label: "6월 연전망" },
  { id: "2026-07", label: "7월 연전망" },
]

const MX: RawRowInput = {
  vendor: "MX",
  kind: "vendor",
  y25: 225.4,
  byVintage: {
    "2026-06": { y26: 228.1, y27: 231.9 },
    "2026-07": { y26: 229.8, y27: 233.2 },
  },
}

const APPLE: RawRowInput = {
  vendor: "Apple",
  kind: "vendor",
  y25: 229.8,
  byVintage: {
    "2026-06": { y26: 234.6, y27: 239.5 },
    "2026-07": { y26: 235.9, y27: 240.7 },
  },
}

const CN_MEMBERS: RawRowInput[] = [
  {
    vendor: "Huawei",
    kind: "member",
    y25: 44.6,
    byVintage: {
      "2026-06": { y26: 49.8, y27: 54.9 },
      "2026-07": { y26: 52.3, y27: 57.1 },
    },
  },
  {
    vendor: "Honor",
    kind: "member",
    y25: 54.9,
    byVintage: {
      "2026-06": { y26: 57.8, y27: 60.1 },
      "2026-07": { y26: 56.6, y27: 59.3 },
    },
  },
  {
    vendor: "Oppo",
    kind: "member",
    y25: 99.7,
    byVintage: {
      "2026-06": { y26: 102.9, y27: 106.4 },
      "2026-07": { y26: 104.1, y27: 107.2 },
    },
  },
  {
    vendor: "Vivo",
    kind: "member",
    y25: 100.3,
    byVintage: {
      "2026-06": { y26: 101.8, y27: 105.0 },
      "2026-07": { y26: 100.6, y27: 103.9 },
    },
  },
  {
    vendor: "Xiaomi",
    kind: "member",
    y25: 169.5,
    byVintage: {
      "2026-06": { y26: 178.2, y27: 185.4 },
      "2026-07": { y26: 181.3, y27: 189.0 },
    },
  },
  {
    vendor: "Lenovo",
    kind: "member",
    y25: 44.8,
    byVintage: {
      "2026-06": { y26: 45.9, y27: 47.2 },
      "2026-07": { y26: 44.7, y27: 46.1 },
    },
  },
  {
    vendor: "Transsion",
    kind: "member",
    y25: 99.9,
    byVintage: {
      "2026-06": { y26: 107.6, y27: 114.8 },
      "2026-07": { y26: 109.8, y27: 117.3 },
    },
  },
  {
    vendor: "CN 기타",
    kind: "member",
    y25: 15.3,
    byVintage: {
      "2026-06": { y26: 15.9, y27: 17.1 },
      "2026-07": { y26: 16.2, y27: 17.4 },
    },
  },
]

const GOOGLE: RawRowInput = {
  vendor: "Google",
  kind: "vendor",
  y25: 9.8,
  byVintage: {
    "2026-06": { y26: 10.9, y27: 12.1 },
    "2026-07": { y26: 11.1, y27: 12.3 },
  },
}

const OTHERS: RawRowInput = {
  vendor: "기타",
  kind: "vendor",
  y25: 104.9,
  byVintage: {
    "2026-06": { y26: 100.2, y27: 97.8 },
    "2026-07": { y26: 97.4, y27: 94.6 },
  },
}

/** YoY ratio, e.g. 0.083 means +8.3%. Null when either side is unusable. */
function yoy(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null || prev === 0) return null
  return curr / prev - 1
}

/** Sum raw inputs into a synthetic group/total row (CN Total, Total). */
function sumRows(vendor: string, kind: TamRowKind, members: RawRowInput[]): RawRowInput {
  const byVintage: Record<string, RawVintageInput> = {}
  for (const v of VINTAGES) {
    byVintage[v.id] = {
      y26: members.reduce((sum, m) => sum + (m.byVintage[v.id]?.y26 ?? 0), 0),
      y27: members.reduce((sum, m) => sum + (m.byVintage[v.id]?.y27 ?? 0), 0),
    }
  }
  return {
    vendor,
    kind,
    y25: members.reduce((sum, m) => sum + m.y25, 0),
    byVintage,
  }
}

function buildBlocks(input: RawRowInput): Record<string, TamBlock> {
  const blocks: Record<string, TamBlock> = {}
  for (const v of VINTAGES) {
    const f = input.byVintage[v.id]
    const y26 = f?.y26 ?? null
    const y27 = f?.y27 ?? null
    blocks[v.id] = {
      y26,
      y27,
      yoy26: yoy(y26, input.y25),
      yoy27: yoy(y27, y26),
    }
  }
  return blocks
}

/** Latest-minus-previous-vintage delta. Null when fewer than 2 vintages exist. */
function buildMom(blocks: Record<string, TamBlock>): TamMom | null {
  if (VINTAGES.length < 2) return null
  const latest = blocks[VINTAGES[VINTAGES.length - 1].id]
  const previous = blocks[VINTAGES[VINTAGES.length - 2].id]
  if (!latest || !previous) return null
  return {
    y26: latest.y26 !== null && previous.y26 !== null ? latest.y26 - previous.y26 : null,
    y27: latest.y27 !== null && previous.y27 !== null ? latest.y27 - previous.y27 : null,
  }
}

function buildRow(input: RawRowInput): TamRow {
  const blocks = buildBlocks(input)
  return {
    vendor: input.vendor,
    kind: input.kind,
    y25: input.y25,
    blocks,
    mom: buildMom(blocks),
  }
}

const CN_TOTAL = sumRows("CN 합계", "group", CN_MEMBERS)
const TOTAL = sumRows("합계", "total", [MX, APPLE, CN_TOTAL, GOOGLE, OTHERS])

export const sampleTamData: TamData = {
  generated_at: "2026-07-05T09:00:00+09:00",
  unit: "백만 대",
  baseline_year: 2025,
  vintages: VINTAGES,
  rows: [
    buildRow(TOTAL),
    buildRow(MX),
    buildRow(APPLE),
    buildRow(CN_TOTAL),
    ...CN_MEMBERS.map(buildRow),
    buildRow(GOOGLE),
    buildRow(OTHERS),
  ],
}
