<#
.SYNOPSIS
  Excel structure profiler (pre-work for TAM DB automation Phase 1).

.DESCRIPTION
  Opens Excel files READ-ONLY and extracts structure info into a JSON file:
    - sheet list / visibility / used range size (always, for every sheet)
    - per selected sheet: top sample rows (default 8 rows x up to 40 cols),
      last 2 rows, distinct formula patterns (up to 15), per-column number
      formats, tables (ListObjects), pivot tables
    - workbook level: defined names, external connections, Power Query
      formulas, external links
  Original files are NEVER modified. Macros are blocked and external
  links are not refreshed. No installation needed (requires Excel).

  Typical flow:
    1. -ListOnly            -> show sheet names/sizes, pick the sheet
    2. -Sheets "SheetName"  -> profile only that sheet
       (or -SheetIndex N if the sheet name causes encoding issues)
  Without -Sheets/-SheetIndex, ALL sheets are profiled in detail.

  NOTE: this file must stay ASCII-only. PowerShell 5.1 misreads
  UTF-8-without-BOM non-ASCII text and corrupts the script.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\Get-ExcelProfile.ps1 -Path "D:\TAM\tam.xlsx" -ListOnly

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\Get-ExcelProfile.ps1 -Path "D:\TAM\tam.xlsx" -Sheets "Forecast"

.EXAMPLE
  # 2nd sheet by position; mask confidential numbers as #NUM (1900-2100 integers kept as years)
  powershell -ExecutionPolicy Bypass -File .\Get-ExcelProfile.ps1 -Path "D:\TAM\tam.xlsx" -SheetIndex 2 -MaskNumbers
#>
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$OutFile = "excel_profile.json",
  [string[]]$Sheets = @(),
  [int[]]$SheetIndex = @(),
  [switch]$ListOnly,
  [int]$SampleRows = 8,
  [int]$TailRows = 2,
  [int]$MaxCols = 40,
  [int]$MaxFormulas = 15,
  [switch]$Recurse,
  [switch]$MaskNumbers
)

$ErrorActionPreference = "Stop"

function Trunc([string]$s, [int]$n) {
  if ($null -eq $s) { return "" }
  if ($s.Length -gt $n) { return $s.Substring(0, $n) + "..." }
  return $s
}

function Convert-CellValue($v) {
  if ($null -eq $v) { return "" }
  if ($v -is [double] -or $v -is [int] -or $v -is [long] -or $v -is [decimal]) {
    if ($MaskNumbers) {
      $d = [double]$v
      if ($d -ge 1900 -and $d -le 2100 -and $d -eq [math]::Floor($d)) { return [string]$v }
      return "#NUM"
    }
    return [string]$v
  }
  return (Trunc ([string]$v) 80)
}

# Read an nR x nC region starting at (r1,c1) as a jagged array of strings
function Get-RegionStrings($ws, [int]$r1, [int]$c1, [int]$nR, [int]$nC) {
  $rng = $ws.Range($ws.Cells.Item($r1, $c1), $ws.Cells.Item($r1 + $nR - 1, $c1 + $nC - 1))
  $vals = $rng.Value2
  $out = @()
  if ($nR -eq 1 -and $nC -eq 1) {
    $out += , @(Convert-CellValue $vals)
    return , $out
  }
  for ($r = 1; $r -le $nR; $r++) {
    $row = @()
    for ($c = 1; $c -le $nC; $c++) {
      $row += Convert-CellValue $vals[$r, $c]
    }
    $out += , $row
  }
  return , $out
}

# Collect distinct formulas in a region (up to $max)
function Get-DistinctFormulas($ws, [int]$r1, [int]$c1, [int]$nR, [int]$nC, [int]$max) {
  $rng = $ws.Range($ws.Cells.Item($r1, $c1), $ws.Cells.Item($r1 + $nR - 1, $c1 + $nC - 1))
  $f = $rng.Formula
  $set = New-Object System.Collections.Generic.HashSet[string]
  if ($nR -eq 1 -and $nC -eq 1) {
    if (($f -is [string]) -and $f.StartsWith("=")) { [void]$set.Add((Trunc $f 150)) }
  }
  else {
    for ($r = 1; $r -le $nR; $r++) {
      for ($c = 1; $c -le $nC; $c++) {
        $x = $f[$r, $c]
        if (($x -is [string]) -and $x.StartsWith("=")) {
          [void]$set.Add((Trunc $x 150))
          if ($set.Count -ge $max) { return @($set) }
        }
      }
    }
  }
  return @($set)
}

# ---- collect target files ----
$exts = @("*.xlsx", "*.xlsm", "*.xlsb", "*.xls")
$files = @()
if (Test-Path -Path $Path -PathType Leaf) {
  $files = @(Get-Item -Path $Path)
}
else {
  foreach ($e in $exts) {
    if ($Recurse) { $files += @(Get-ChildItem -Path $Path -Filter $e -Recurse -File) }
    else { $files += @(Get-ChildItem -Path $Path -Filter $e -File) }
  }
  $files = @($files | Where-Object { $_.Name -notlike "~`$*" } | Sort-Object FullName)
}
if ($files.Count -eq 0) {
  Write-Host "No Excel files found under: $Path"
  exit 1
}
Write-Host ("Found {0} Excel file(s)" -f $files.Count)

$filterActive = ($Sheets.Count -gt 0 -or $SheetIndex.Count -gt 0)

# ---- start Excel (no UI, macros blocked, no link refresh) ----
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.EnableEvents = $false
$excel.AskToUpdateLinks = $false
$excel.ScreenUpdating = $false
try { $excel.AutomationSecurity = 3 } catch {}  # msoAutomationSecurityForceDisable

$allFiles = @()
$errorCount = 0
$i = 0

try {
  foreach ($f in $files) {
    $i++
    Write-Host ("[{0}/{1}] {2}" -f $i, $files.Count, $f.Name)
    $entry = [ordered]@{
      file     = $f.Name
      path     = $f.FullName
      sizeKB   = [math]::Round($f.Length / 1KB, 1)
      modified = $f.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
    }
    $wb = $null
    try {
      # Open(file, UpdateLinks:=0, ReadOnly:=True)
      $wb = $excel.Workbooks.Open($f.FullName, 0, $true)

      try { $entry.hasMacros = [bool]$wb.HasVBProject } catch { $entry.hasMacros = $null }

      # ---- sheet list (always, every sheet, cheap) ----
      $sheetList = @()
      $idx = 0
      foreach ($ws in $wb.Worksheets) {
        $idx++
        $item = [ordered]@{
          index   = $idx
          name    = $ws.Name
          visible = [int]$ws.Visible   # -1=visible, 0=hidden, 2=veryhidden
          rows    = [int]$ws.UsedRange.Rows.Count
          cols    = [int]$ws.UsedRange.Columns.Count
        }
        $sheetList += $item
        $hiddenTag = ""
        if ($item.visible -ne -1) { $hiddenTag = "  (hidden)" }
        Write-Host ("    [{0}] {1}  {2} rows x {3} cols{4}" -f $item.index, $item.name, $item.rows, $item.cols, $hiddenTag)
      }
      $entry.sheetList = $sheetList

      if (-not $ListOnly) {
        # ---- detailed profile of selected (or all) sheets ----
        # NOTE: PS variables are case-INsensitive; this must not be named
        # $sheets or it clobbers the $Sheets parameter
        $profiled = @()
        $idx = 0
        foreach ($ws in $wb.Worksheets) {
          $idx++
          if ($filterActive -and -not (($Sheets -contains $ws.Name) -or ($SheetIndex -contains $idx))) { continue }

          $ur = $ws.UsedRange
          $addr = ""
          try { $addr = [string]$ur.Address(0, 0) } catch {}
          $s = [ordered]@{
            index     = $idx
            name      = $ws.Name
            visible   = [int]$ws.Visible
            usedRange = $addr
            rows      = [int]$ur.Rows.Count
            cols      = [int]$ur.Columns.Count
          }
          $nC = [math]::Min($MaxCols, $s.cols)
          $nHead = [math]::Min($SampleRows, $s.rows)

          $s.headSample = Get-RegionStrings $ws $ur.Row $ur.Column $nHead $nC
          if ($s.rows -gt ($SampleRows + $TailRows)) {
            $tailStart = $ur.Row + $s.rows - $TailRows
            $s.tailSample = Get-RegionStrings $ws $tailStart $ur.Column $TailRows $nC
          }

          # per-column number formats from row 2 (helps spot date/number columns)
          if ($s.rows -ge 2) {
            $fmts = @()
            for ($c = 0; $c -lt $nC; $c++) {
              $fmt = ""
              try { $fmt = [string]$ur.Cells.Item(2, $c + 1).NumberFormat } catch {}
              $fmts += $fmt
            }
            $s.columnFormats = $fmts
          }

          # distinct formulas from the top part of the sheet (up to 60 rows)
          $fRows = [math]::Min(60, $s.rows)
          $s.formulas = @(Get-DistinctFormulas $ws $ur.Row $ur.Column $fRows $nC $MaxFormulas)

          # tables (ListObjects)
          $tables = @()
          foreach ($lo in $ws.ListObjects) {
            $tAddr = ""
            try { $tAddr = [string]$lo.Range.Address(0, 0) } catch {}
            $t = [ordered]@{ name = $lo.Name; range = $tAddr }
            try {
              $hrr = $lo.HeaderRowRange
              $hv = $hrr.Value2
              $hdr = @()
              $hc = [int]$hrr.Columns.Count
              if ($hc -eq 1) { $hdr += Convert-CellValue $hv }
              else { for ($c = 1; $c -le $hc; $c++) { $hdr += Convert-CellValue $hv[1, $c] } }
              $t.headers = $hdr
            }
            catch {}
            $tables += $t
          }
          if ($tables.Count -gt 0) { $s.tables = $tables }

          # pivot tables
          $pivots = @()
          foreach ($pt in @($ws.PivotTables())) {
            $p = [ordered]@{ name = $pt.Name }
            try { $p.source = Trunc ([string]$pt.SourceData) 200 } catch { $p.source = "(unavailable)" }
            $pivots += $p
          }
          if ($pivots.Count -gt 0) { $s.pivotTables = $pivots }

          try {
            $chartCount = [int]$ws.ChartObjects().Count
            if ($chartCount -gt 0) { $s.charts = $chartCount }
          }
          catch {}

          $profiled += $s
        }
        $entry.sheets = $profiled
        if ($filterActive -and $profiled.Count -eq 0) {
          $entry.warning = "No sheet matched -Sheets/-SheetIndex. Check sheetList and retry."
          Write-Host "  !! no sheet matched the requested name/index (see list above)"
        }

        # ---- defined names ----
        $names = @()
        foreach ($nm in $wb.Names) {
          try { $names += [ordered]@{ name = [string]$nm.Name; refersTo = Trunc ([string]$nm.RefersTo) 200 } } catch {}
        }
        if ($names.Count -gt 0) { $entry.definedNames = $names }

        # ---- external connections ----
        $conns = @()
        foreach ($cn in $wb.Connections) {
          $c = [ordered]@{ name = [string]$cn.Name }
          try { $c.description = Trunc ([string]$cn.Description) 200 } catch {}
          try {
            $oledb = $cn.OLEDBConnection
            if ($null -ne $oledb) {
              $c.connection = Trunc ([string]$oledb.Connection) 250
              $c.commandText = Trunc ([string]$oledb.CommandText) 300
            }
          }
          catch {}
          $conns += $c
        }
        if ($conns.Count -gt 0) { $entry.connections = $conns }

        # ---- Power Query (Excel 2016+) ----
        $queries = @()
        try {
          foreach ($q in $wb.Queries) {
            $queries += [ordered]@{ name = [string]$q.Name; formula = Trunc ([string]$q.Formula) 800 }
          }
        }
        catch {}
        if ($queries.Count -gt 0) { $entry.powerQueries = $queries }

        # ---- external links ----
        try {
          $links = $wb.LinkSources(1)  # xlExcelLinks
          if ($null -ne $links) { $entry.externalLinks = @($links | ForEach-Object { [string]$_ }) }
        }
        catch {}
      }
    }
    catch {
      $entry.error = [string]$_.Exception.Message
      $errorCount++
      Write-Host ("  !! error: {0}" -f $entry.error)
    }
    finally {
      if ($null -ne $wb) {
        try { $wb.Close($false) } catch {}
      }
    }
    $allFiles += $entry
  }
}
finally {
  try { $excel.Quit() } catch {}
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

# ---- save result ----
$result = [ordered]@{
  generatedAt = (Get-Date).ToString("s")
  root        = [string](Resolve-Path -Path $Path).Path
  maskNumbers = [bool]$MaskNumbers
  listOnly    = [bool]$ListOnly
  fileCount   = $allFiles.Count
  errorCount  = $errorCount
  files       = $allFiles
}
$json = $result | ConvertTo-Json -Depth 15
$json | Out-File -FilePath $OutFile -Encoding utf8

$outItem = Get-Item -Path $OutFile
Write-Host ""
Write-Host ("Done: {0} file(s), {1} error(s)" -f $allFiles.Count, $errorCount)
Write-Host ("Output: {0} ({1} KB)" -f $outItem.FullName, [math]::Round($outItem.Length / 1KB, 1))
