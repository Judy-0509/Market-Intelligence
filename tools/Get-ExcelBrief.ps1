<#
.SYNOPSIS
  Compact plain-text Excel structure brief (small sibling of Get-ExcelProfile.ps1).

.DESCRIPTION
  Opens Excel files READ-ONLY and writes a compact plain-text summary (~10x
  smaller than the JSON profiler): sheet list, per-sheet used range, header
  row, a couple of sample rows, last row, column types, formula presence,
  tables/pivots, and workbook-level counts (names/links/queries/connections).

  Built for carrying structure info out through a channel with a strict
  character limit. Use -ListOnly first, then -Sheets/-SheetIndex to narrow
  down, and -MaxChars to split the output into pieces that each fit the
  limit.

  Original files are NEVER modified. Macros are blocked and external links
  are not refreshed. No installation needed (requires Excel).

  NOTE: this file must stay ASCII-only. PowerShell 5.1 misreads
  UTF-8-without-BOM non-ASCII text and corrupts the script.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\Get-ExcelBrief.ps1 -Path "D:\TAM\tam.xlsx" -ListOnly

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\Get-ExcelBrief.ps1 -Path "D:\TAM\tam.xlsx" -Sheets "Forecast"

.EXAMPLE
  # split output into <= 1500 char parts for a channel with a strict limit
  powershell -ExecutionPolicy Bypass -File .\Get-ExcelBrief.ps1 -Path "D:\TAM\tam.xlsx" -MaxChars 1500
#>
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string[]]$Sheets = @(),
  [int[]]$SheetIndex = @(),
  [switch]$ListOnly,
  [int]$DataRows = 2,
  [int]$MaxColsShown = 25,
  [int]$CellChars = 18,
  [int]$MaxChars = 0,
  [string]$OutFile = "excel_brief.txt",
  [switch]$Recurse,
  [switch]$MaskNumbers
)

$ErrorActionPreference = "Stop"

function Trunc-Text([string]$s, [int]$n) {
  if ($null -eq $s) { return "" }
  if ($s.Length -gt $n) { return $s.Substring(0, $n) + ".." }
  return $s
}

function Convert-BriefValue($v) {
  if ($null -eq $v) { return "" }
  if ($v -is [double] -or $v -is [int] -or $v -is [long] -or $v -is [decimal]) {
    if ($MaskNumbers) {
      $d = [double]$v
      if ($d -ge 1900 -and $d -le 2100 -and $d -eq [math]::Floor($d)) { return [string]$v }
      return "#N"
    }
    return [string]$v
  }
  return (Trunc-Text ([string]$v) $CellChars)
}

# Read one row (nC cols starting at c1) as brief-converted strings.
# Uses the Value2 2D-array pattern and the 1x1-scalar edge case, same as
# Get-RegionStrings in Get-ExcelProfile.ps1.
function Get-RowValues($ws, [int]$r1, [int]$c1, [int]$nC) {
  $rng = $ws.Range($ws.Cells.Item($r1, $c1), $ws.Cells.Item($r1, $c1 + $nC - 1))
  $vals = $rng.Value2
  $out = @()
  if ($nC -eq 1) {
    $out += (Convert-BriefValue $vals)
    return , $out
  }
  for ($c = 1; $c -le $nC; $c++) {
    $out += Convert-BriefValue $vals[1, $c]
  }
  return , $out
}

function Format-DataRowLine([string]$label, $values, [int]$hiddenColCount) {
  $line = ("{0}: {1}" -f $label, ($values -join " | "))
  if ($hiddenColCount -gt 0) { $line += (" |+{0}" -f $hiddenColCount) }
  return $line
}

# One type code per column, derived from the first data row.
function Get-TypeLine($ws, $ur, [int]$colCount) {
  $nC = [math]::Min($colCount, 40)
  $rowCount = [int]$ur.Rows.Count
  $dataRowAbs = [int]$ur.Row
  if ($rowCount -ge 2) { $dataRowAbs = $dataRowAbs + 1 }
  $codes = @()
  for ($c = 0; $c -lt $nC; $c++) {
    $cell = $ws.Cells.Item($dataRowAbs, [int]$ur.Column + $c)
    $hasFormula = $false
    try { $hasFormula = [bool]$cell.HasFormula } catch {}
    if ($hasFormula) {
      $codes += "f"
      continue
    }
    $v = $cell.Value2
    if ($null -eq $v) {
      $codes += "e"
    }
    elseif ($v -is [bool]) {
      $codes += "b"
    }
    elseif ($v -is [string]) {
      $codes += "t"
    }
    elseif ($v -is [double] -or $v -is [int] -or $v -is [long] -or $v -is [decimal]) {
      $isDate = $false
      try {
        $fmt = [string]$cell.NumberFormat
        if ($fmt -match "[ymdhsYMDHS]") { $isDate = $true }
      }
      catch {}
      if ($isDate) { $codes += "d" } else { $codes += "n" }
    }
    else {
      $codes += "e"
    }
  }
  $line = "TY: " + ($codes -join " ")
  if ($colCount -gt 40) { $line += (" +{0}" -f ($colCount - 40)) }
  return $line
}

# Total formula-cell count plus up to 2 distinct formulas (truncated to 60
# chars) over a top-left region, using the .Formula 2D-array pattern (same
# approach as Get-DistinctFormulas in Get-ExcelProfile.ps1) but counting
# every formula cell rather than stopping once distinct formulas are found.
function Get-FormulaInfo($ws, [int]$r1, [int]$c1, [int]$nR, [int]$nC) {
  $rng = $ws.Range($ws.Cells.Item($r1, $c1), $ws.Cells.Item($r1 + $nR - 1, $c1 + $nC - 1))
  $f = $rng.Formula
  $count = 0
  $seen = New-Object System.Collections.Generic.HashSet[string]
  $sample = @()
  if ($nR -eq 1 -and $nC -eq 1) {
    if (($f -is [string]) -and $f.StartsWith("=")) {
      $count = 1
      [void]$seen.Add($f)
      $sample += (Trunc-Text $f 60)
    }
  }
  else {
    for ($r = 1; $r -le $nR; $r++) {
      for ($c = 1; $c -le $nC; $c++) {
        $x = $f[$r, $c]
        if (($x -is [string]) -and $x.StartsWith("=")) {
          $count++
          if (-not $seen.Contains($x)) {
            [void]$seen.Add($x)
            if ($sample.Count -lt 2) { $sample += (Trunc-Text $x 60) }
          }
        }
      }
    }
  }
  return [ordered]@{ Count = $count; Sample = $sample }
}

# Split lines into parts, each part (with its "[p i/N]" prefix line) no
# longer than charLimit. A single line longer than charLimit is hard-split.
function Split-BriefLines([string[]]$lines, [int]$charLimit) {
  $guessTotal = 1
  $finalChunks = $null
  for ($iter = 0; $iter -lt 6; $iter++) {
    $prefixLen = ("[p {0}/{1}]" -f $guessTotal, $guessTotal).Length
    $budget = $charLimit - $prefixLen - 1
    if ($budget -lt 1) { $budget = 1 }

    $chunks = @()
    $cur = @()
    $curLen = 0
    foreach ($line in $lines) {
      $lineLen = $line.Length
      if ($lineLen -gt $budget) {
        if ($cur.Count -gt 0) { $chunks += , $cur; $cur = @(); $curLen = 0 }
        $pos = 0
        while ($pos -lt $lineLen) {
          $take = [math]::Min($budget, $lineLen - $pos)
          $chunks += , @($line.Substring($pos, $take))
          $pos += $take
        }
        continue
      }
      $addLen = $lineLen
      if ($cur.Count -gt 0) { $addLen = $addLen + 1 }
      if ($cur.Count -gt 0 -and ($curLen + $addLen) -gt $budget) {
        $chunks += , $cur
        $cur = @($line)
        $curLen = $lineLen
      }
      else {
        if ($cur.Count -gt 0) { $curLen++ }
        $cur += $line
        $curLen += $lineLen
      }
    }
    if ($cur.Count -gt 0) { $chunks += , $cur }

    if ($chunks.Count -eq $guessTotal -or $iter -eq 5) {
      $finalChunks = $chunks
      break
    }
    $guessTotal = $chunks.Count
    if ($guessTotal -lt 1) { $guessTotal = 1 }
  }

  $total = $finalChunks.Count
  $parts = @()
  for ($i = 0; $i -lt $total; $i++) {
    $prefix = "[p {0}/{1}]" -f ($i + 1), $total
    $content = ($finalChunks[$i] -join "`n")
    $parts += ($prefix + "`n" + $content)
  }
  return , $parts
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

$filterActive = ($Sheets.Count -gt 0 -or $SheetIndex.Count -gt 0)

# ---- start Excel (no UI, macros blocked, no link refresh) ----
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.EnableEvents = $false
$excel.AskToUpdateLinks = $false
$excel.ScreenUpdating = $false
try { $excel.AutomationSecurity = 3 } catch {}  # msoAutomationSecurityForceDisable

$outLines = @()
$outLines += "## legend: H1=row1 R2/R3=sample rows RL=last row TY: t=text n=num d=date f=formula b=bool e=empty"

try {
  foreach ($f in $files) {
    $wb = $null
    try {
      $sizeKB = [math]::Round($f.Length / 1KB, 1)
      $modified = $f.LastWriteTime.ToString("yyyy-MM-dd")

      # Open(file, UpdateLinks:=0, ReadOnly:=True)
      $wb = $excel.Workbooks.Open($f.FullName, 0, $true)

      $sheetListParts = @()
      $detailLines = @()
      $sheetCount = [int]$wb.Worksheets.Count

      for ($wsIdx = 1; $wsIdx -le $sheetCount; $wsIdx++) {
        $ws = $wb.Worksheets.Item($wsIdx)
        $hiddenTag = ""
        if ([int]$ws.Visible -ne -1) { $hiddenTag = "(h)" }
        $sheetListParts += ("[{0}]{1}{2}" -f $wsIdx, $ws.Name, $hiddenTag)

        if ($ListOnly) { continue }
        $isMatch = (-not $filterActive) -or ($Sheets -contains $ws.Name) -or ($SheetIndex -contains $wsIdx)
        if (-not $isMatch) { continue }

        $ur = $ws.UsedRange
        $addr = ""
        try { $addr = [string]$ur.Address(0, 0) } catch {}
        $rowCount = [int]$ur.Rows.Count
        $colCount = [int]$ur.Columns.Count
        $rowStart = [int]$ur.Row
        $colStart = [int]$ur.Column

        $detailLines += ("-- [{0}] {1} | {2} | {3}r x {4}c" -f $wsIdx, $ws.Name, $addr, $rowCount, $colCount)

        $nColsShown = [math]::Min($colCount, $MaxColsShown)
        $hiddenColCount = 0
        if ($colCount -gt $MaxColsShown) { $hiddenColCount = $colCount - $MaxColsShown }

        # H1
        $h1Vals = Get-RowValues $ws $rowStart $colStart $nColsShown
        $detailLines += Format-DataRowLine "H1" $h1Vals $hiddenColCount

        # R2 .. R(1+DataRows), only rows that exist
        for ($k = 1; $k -le $DataRows; $k++) {
          $relRow = $k + 1
          if ($relRow -gt $rowCount) { break }
          $absRow = $rowStart + $relRow - 1
          $rVals = Get-RowValues $ws $absRow $colStart $nColsShown
          $detailLines += Format-DataRowLine ("R{0}" -f $relRow) $rVals $hiddenColCount
        }

        # RL, only when it would not duplicate an already-shown row
        if ($rowCount -gt (1 + $DataRows + 1)) {
          $lastAbsRow = $rowStart + $rowCount - 1
          $rlVals = Get-RowValues $ws $lastAbsRow $colStart $nColsShown
          $detailLines += Format-DataRowLine "RL" $rlVals $hiddenColCount
        }

        # TY
        $detailLines += Get-TypeLine $ws $ur $colCount

        # FX (omit when no formulas)
        $fRows = [math]::Min(60, $rowCount)
        $fCols = [math]::Min(40, $colCount)
        $fxInfo = Get-FormulaInfo $ws $rowStart $colStart $fRows $fCols
        if ($fxInfo.Count -gt 0) {
          $fxLine = "FX: " + $fxInfo.Count
          if ($fxInfo.Sample.Count -gt 0) { $fxLine += " | " + ($fxInfo.Sample -join " | ") }
          $detailLines += $fxLine
        }

        # XT (omit when both zero)
        $tblCount = 0
        try { $tblCount = [int]$ws.ListObjects.Count } catch {}
        $pvtCount = 0
        try { $pvtCount = [int]@($ws.PivotTables()).Count } catch {}
        if ($tblCount -gt 0 -or $pvtCount -gt 0) {
          $detailLines += ("XT: tbl={0} pvt={1}" -f $tblCount, $pvtCount)
        }
      }

      $headerLine = "== {0} | {1}KB | {2} | {3} sheets: {4}" -f $f.Name, $sizeKB, $modified, $sheetCount, ($sheetListParts -join " ")
      $outLines += $headerLine
      $outLines += $detailLines

      if (-not $ListOnly) {
        # ---- workbook-level counts (omit line if all zero) ----
        $nmCount = 0
        try { $nmCount = [int]@($wb.Names).Count } catch {}
        $lnkCount = 0
        try {
          $links = $wb.LinkSources(1)  # xlExcelLinks
          if ($null -ne $links) { $lnkCount = [int]@($links).Count }
        }
        catch {}
        $pqCount = 0
        try { $pqCount = [int]@($wb.Queries).Count } catch {}
        $connCount = 0
        try { $connCount = [int]$wb.Connections.Count } catch {}

        if ($nmCount -gt 0 -or $lnkCount -gt 0 -or $pqCount -gt 0 -or $connCount -gt 0) {
          $outLines += ("WB: nm={0} lnk={1} pq={2} conn={3}" -f $nmCount, $lnkCount, $pqCount, $connCount)
        }
      }
    }
    catch {
      $outLines += ("== {0} | ERROR: {1}" -f $f.Name, [string]$_.Exception.Message)
    }
    finally {
      if ($null -ne $wb) {
        try { $wb.Close($false) } catch {}
      }
    }
  }
}
finally {
  try { $excel.Quit() } catch {}
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

# ---- output ----
$fullText = ($outLines -join "`n")

foreach ($line in $outLines) { Write-Host $line }

$fullText | Out-File -FilePath $OutFile -Encoding utf8
Write-Host ""
Write-Host ("chars: {0}" -f $fullText.Length)

if ($MaxChars -gt 0) {
  $parts = Split-BriefLines $outLines $MaxChars
  $dir = Split-Path -Path $OutFile -Parent
  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($OutFile)
  $ext = [System.IO.Path]::GetExtension($OutFile)
  for ($i = 0; $i -lt $parts.Count; $i++) {
    $partName = "{0}_p{1}{2}" -f $baseName, ($i + 1), $ext
    if ($dir) { $partFile = Join-Path $dir $partName } else { $partFile = $partName }
    $parts[$i] | Out-File -FilePath $partFile -Encoding utf8
    Write-Host ("part: {0} | chars: {1}" -f $partFile, $parts[$i].Length)
  }
}
