import { Fragment } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  formatMom,
  formatNumber,
  formatYoy,
  momColorClassName,
  sourceKindTintClassName,
} from "@/lib/format"
import type { TamData, TamRowKind, TamSource } from "@/data/types"

/** Row-level emphasis: Total is bold with a subtle fill, CN Total is a
 * visually distinct subtotal, member rows carry no row styling of their own
 * (they're indented at the vendor cell instead). */
function rowClassName(kind: TamRowKind): string {
  switch (kind) {
    case "total":
      return "bg-muted/50 font-semibold"
    case "group":
      return "border-y border-border bg-muted/25 font-medium"
    default:
      return ""
  }
}

function vendorCellClassName(kind: TamRowKind): string {
  return kind === "member" ? "pl-8" : ""
}

/** Alternating background nuance so adjacent vintage column-groups within the
 * SAME source read as visually separated blocks, in addition to the border. */
function vintageBgClassName(localVintageIndex: number): string {
  return localVintageIndex % 2 === 1 ? "bg-muted/20" : ""
}

/** Left border between source groups is a step stronger than the (existing)
 * border between vintage groups within a source, so the eye catches the
 * bigger seam first. Only the leftmost column of a source's block (its
 * first vintage / its own group th) gets the stronger weight. */
function sourceBoundaryClassName(sourceIndex: number): string {
  return sourceIndex > 0 ? "border-l-2 border-border" : "border-l border-border"
}

/** colSpan for one source's row-1 group header: 4 columns per vintage, plus
 * 2 more if this source has a 전월비 pair to show. Fully data-driven — a new
 * vintage or source changes this automatically. */
function sourceColSpan(source: TamSource, hasMom: boolean): number {
  return source.vintages.length * 4 + (hasMom ? 2 : 0)
}

export function TamTable({ data }: { data: TamData }) {
  const sourceHasMom = (sourceId: string) =>
    data.rows.some((row) => row.mom[sourceId] != null)

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table className="text-xs">
        <TableHeader className="sticky top-0 z-10 bg-card">
          {/* Row 1: Vendor / '25 기준 (both span all 3 header rows), then one
              group th per source. */}
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" rowSpan={3} className="align-bottom text-sm">
              Vendor
            </TableHead>
            <TableHead
              scope="col"
              rowSpan={3}
              className="border-l border-border text-right align-bottom"
            >
              &apos;25 기준
            </TableHead>
            {data.sources.map((source, sourceIndex) => (
              <TableHead
                key={source.id}
                scope="colgroup"
                colSpan={sourceColSpan(source, sourceHasMom(source.id))}
                className={cn(
                  "text-center",
                  sourceBoundaryClassName(sourceIndex),
                  sourceKindTintClassName(source.kind)
                )}
              >
                {source.label}
              </TableHead>
            ))}
          </TableRow>
          {/* Row 2: per source, its vintage labels (colSpan=4 each) + 전월비
              (colSpan=2) if this source has any non-null mom. */}
          <TableRow className="hover:bg-transparent">
            {data.sources.map((source, sourceIndex) => {
              const hasMom = sourceHasMom(source.id)
              return (
                <Fragment key={source.id}>
                  {source.vintages.map((vintage, localIndex) => (
                    <TableHead
                      key={vintage.id}
                      scope="colgroup"
                      colSpan={4}
                      className={cn(
                        "text-center",
                        localIndex === 0
                          ? sourceBoundaryClassName(sourceIndex)
                          : "border-l border-border",
                        vintageBgClassName(localIndex)
                      )}
                    >
                      {vintage.label}
                    </TableHead>
                  ))}
                  {hasMom && (
                    <TableHead
                      scope="colgroup"
                      colSpan={2}
                      className="border-l border-border text-center"
                    >
                      전월비
                    </TableHead>
                  )}
                </Fragment>
              )
            })}
          </TableRow>
          {/* Row 3: leaf columns — '26 | '27 | YoY '26 | YoY '27 per vintage,
              '26 | '27 per 전월비 pair. */}
          <TableRow className="hover:bg-transparent">
            {data.sources.map((source, sourceIndex) => {
              const hasMom = sourceHasMom(source.id)
              return (
                <Fragment key={source.id}>
                  {source.vintages.map((vintage, localIndex) => (
                    <Fragment key={vintage.id}>
                      <TableHead
                        scope="col"
                        className={cn(
                          "text-right",
                          localIndex === 0
                            ? sourceBoundaryClassName(sourceIndex)
                            : "border-l border-border",
                          vintageBgClassName(localIndex)
                        )}
                      >
                        &apos;26
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("text-right", vintageBgClassName(localIndex))}
                      >
                        &apos;27
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("text-right", vintageBgClassName(localIndex))}
                      >
                        YoY &apos;26
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("text-right", vintageBgClassName(localIndex))}
                      >
                        YoY &apos;27
                      </TableHead>
                    </Fragment>
                  ))}
                  {hasMom && (
                    <>
                      <TableHead scope="col" className="border-l border-border text-right">
                        &apos;26
                      </TableHead>
                      <TableHead scope="col" className="text-right">
                        &apos;27
                      </TableHead>
                    </>
                  )}
                </Fragment>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.vendor} className={rowClassName(row.kind)}>
              {/* Row header (<th scope="row">) for a11y; h-auto/p-2 override
                  TableHead's header sizing so it renders identical to a TableCell. */}
              <TableHead
                scope="row"
                className={cn(
                  "h-auto p-2 text-sm font-medium whitespace-nowrap",
                  vendorCellClassName(row.kind)
                )}
              >
                {row.vendor}
              </TableHead>
              <TableCell className="border-l border-border text-right tabular-nums">
                {formatNumber(row.y25)}
              </TableCell>
              {data.sources.map((source, sourceIndex) => {
                const hasMom = sourceHasMom(source.id)
                const mom = row.mom[source.id] ?? null
                return (
                  <Fragment key={source.id}>
                    {source.vintages.map((vintage, localIndex) => {
                      const block = row.blocks[source.id]?.[vintage.id]
                      return (
                        <Fragment key={vintage.id}>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              localIndex === 0
                                ? sourceBoundaryClassName(sourceIndex)
                                : "border-l border-border",
                              vintageBgClassName(localIndex)
                            )}
                          >
                            {formatNumber(block?.y26 ?? null)}
                          </TableCell>
                          <TableCell
                            className={cn("text-right tabular-nums", vintageBgClassName(localIndex))}
                          >
                            {formatNumber(block?.y27 ?? null)}
                          </TableCell>
                          <TableCell
                            className={cn("text-right tabular-nums", vintageBgClassName(localIndex))}
                          >
                            {formatYoy(block?.yoy26 ?? null)}
                          </TableCell>
                          <TableCell
                            className={cn("text-right tabular-nums", vintageBgClassName(localIndex))}
                          >
                            {formatYoy(block?.yoy27 ?? null)}
                          </TableCell>
                        </Fragment>
                      )
                    })}
                    {hasMom && (
                      <>
                        <TableCell
                          className={cn(
                            "border-l border-border text-right tabular-nums",
                            momColorClassName(mom?.y26 ?? null)
                          )}
                        >
                          {formatMom(mom?.y26 ?? null)}
                        </TableCell>
                        <TableCell
                          className={cn("text-right tabular-nums", momColorClassName(mom?.y27 ?? null))}
                        >
                          {formatMom(mom?.y27 ?? null)}
                        </TableCell>
                      </>
                    )}
                  </Fragment>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
