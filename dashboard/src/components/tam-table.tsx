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
import { formatMom, formatNumber, formatYoy, momColorClassName } from "@/lib/format"
import type { TamData, TamRowKind } from "@/data/types"

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

/** Alternating background nuance so adjacent vintage column-groups read as
 * visually separated blocks, in addition to the left border. */
function groupBgClassName(index: number): string {
  return index % 2 === 1 ? "bg-muted/20" : ""
}

export function TamTable({ data }: { data: TamData }) {
  const hasMom = data.rows.some((row) => row.mom !== null)

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table className="text-xs">
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead rowSpan={2} className="align-bottom text-sm">
              Vendor
            </TableHead>
            <TableHead rowSpan={2} className="border-l border-border text-right align-bottom">
              &apos;25 기준
            </TableHead>
            {data.vintages.map((vintage, index) => (
              <TableHead
                key={vintage.id}
                colSpan={4}
                className={cn(
                  "border-l border-border text-center",
                  groupBgClassName(index)
                )}
              >
                {vintage.label}
              </TableHead>
            ))}
            {hasMom && (
              <TableHead colSpan={2} className="border-l border-border text-center">
                전월비
              </TableHead>
            )}
          </TableRow>
          <TableRow className="hover:bg-transparent">
            {data.vintages.map((vintage, index) => (
              <Fragment key={vintage.id}>
                <TableHead
                  className={cn("border-l border-border text-right", groupBgClassName(index))}
                >
                  &apos;26
                </TableHead>
                <TableHead className={cn("text-right", groupBgClassName(index))}>
                  &apos;27
                </TableHead>
                <TableHead className={cn("text-right", groupBgClassName(index))}>
                  YoY &apos;26
                </TableHead>
                <TableHead className={cn("text-right", groupBgClassName(index))}>
                  YoY &apos;27
                </TableHead>
              </Fragment>
            ))}
            {hasMom && (
              <>
                <TableHead className="border-l border-border text-right">&apos;26</TableHead>
                <TableHead className="text-right">&apos;27</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.vendor} className={rowClassName(row.kind)}>
              <TableCell
                className={cn("text-sm font-medium whitespace-nowrap", vendorCellClassName(row.kind))}
              >
                {row.vendor}
              </TableCell>
              <TableCell className="border-l border-border text-right tabular-nums">
                {formatNumber(row.y25)}
              </TableCell>
              {data.vintages.map((vintage, index) => {
                const block = row.blocks[vintage.id]
                return (
                  <Fragment key={vintage.id}>
                    <TableCell
                      className={cn(
                        "border-l border-border text-right tabular-nums",
                        groupBgClassName(index)
                      )}
                    >
                      {formatNumber(block?.y26 ?? null)}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", groupBgClassName(index))}>
                      {formatNumber(block?.y27 ?? null)}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", groupBgClassName(index))}>
                      {formatYoy(block?.yoy26 ?? null)}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", groupBgClassName(index))}>
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
                      momColorClassName(row.mom?.y26 ?? null)
                    )}
                  >
                    {formatMom(row.mom?.y26 ?? null)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      momColorClassName(row.mom?.y27 ?? null)
                    )}
                  >
                    {formatMom(row.mom?.y27 ?? null)}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
