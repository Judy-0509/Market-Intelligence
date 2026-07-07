import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TamTable } from "@/components/tam-table"
import { sourceKindTintClassName } from "@/lib/format"
import { sampleTamData } from "@/data/sample"
import type { TamData, TamSourceKind } from "@/data/types"

// The in-house Python script injects a real TamData payload into this
// global (see the /*TAM_DATA_START*/ marker in index.html). Until then it
// stays null and the bundled sample data below is used instead.
declare global {
  interface Window {
    __TAM_DATA__: TamData | null
  }
}

function resolveData(): TamData {
  return window.__TAM_DATA__ ?? sampleTamData
}

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Most recent vintage across ALL sources (vintage ids sort chronologically
 * as plain strings, e.g. "2026-08" > "2026-07"), for the header badge. */
function latestVintageLabel(data: TamData): string | null {
  let latest: { id: string; label: string } | null = null
  for (const source of data.sources) {
    for (const vintage of source.vintages) {
      if (!latest || vintage.id > latest.id) latest = vintage
    }
  }
  return latest?.label ?? null
}

const LEGEND_ITEMS: { kind: TamSourceKind; label: string }[] = [
  { kind: "internal", label: "내부" },
  { kind: "affiliate", label: "관계사" },
  { kind: "research", label: "조사기관" },
]

export function App() {
  const data = resolveData()
  const latestVintage = latestVintageLabel(data)

  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold text-foreground">스마트폰 TAM</h1>
          <span className="text-sm text-muted-foreground">Market Intelligence</span>
          {latestVintage && <Badge variant="secondary">{latestVintage} 기준</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          생성: {formatGeneratedAt(data.generated_at)} · 단위: {data.unit}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>벤더별 연전망 비교</CardTitle>
          <CardDescription>
            <span className="flex flex-wrap items-center gap-1.5">
              {LEGEND_ITEMS.map((item) => (
                <Badge
                  key={item.kind}
                  variant="outline"
                  className={sourceKindTintClassName(item.kind)}
                >
                  {item.label}
                </Badge>
              ))}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TamTable data={data} />
        </CardContent>
      </Card>
    </div>
  )
}

export default App
