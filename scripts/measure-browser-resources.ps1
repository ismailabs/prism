# Read-only Windows diagnostics. Run alongside one browser suite; create StopFile
# to finish. No process termination, machine settings or provider access.
param(
  [Parameter(Mandatory)][string]$OutputFile,
  [Parameter(Mandatory)][string]$StopFile
)
$ErrorActionPreference = 'Stop'
$counters = @('\Processor(_Total)\% Processor Time', '\Memory\Available MBytes', '\Memory\Pages Input/sec', '\Memory\Page Reads/sec', '\Memory\% Committed Bytes In Use')
while (-not (Test-Path -LiteralPath $StopFile)) {
  $sample = Get-Counter -Counter $counters -SampleInterval 1 -MaxSamples 1
  $values = $sample.CounterSamples
  $processes = Get-Process -Name node,msedge -ErrorAction SilentlyContinue
  [ordered]@{
    utc = [DateTime]::UtcNow.ToString('o')
    cpuPercent = $values[0].CookedValue
    availableMB = $values[1].CookedValue
    pagesInputPerSec = $values[2].CookedValue
    pageReadsPerSec = $values[3].CookedValue
    committedPercent = $values[4].CookedValue
    nodeWorkingSetMB = [math]::Round((($processes | Where-Object ProcessName -eq node | Measure-Object WorkingSet64 -Sum).Sum / 1MB), 1)
    edgeWorkingSetMB = [math]::Round((($processes | Where-Object ProcessName -eq msedge | Measure-Object WorkingSet64 -Sum).Sum / 1MB), 1)
  } | ConvertTo-Json -Compress | Add-Content -LiteralPath $OutputFile
  Start-Sleep -Seconds 4
}
