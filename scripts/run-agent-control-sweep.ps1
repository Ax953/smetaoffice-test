param(
  [string]$ApiBase = $env:SMETA_OFFICE_API_URL,
  [string]$LogDir = "C:\ProgramData\SmetaGroup\Logs"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ApiBase)) {
  $ApiBase = "http://127.0.0.1:8787/api"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$logPath = Join-Path $LogDir "smetaoffice-agent-sweep.log"
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
  $headers = @{}
  if (-not [string]::IsNullOrWhiteSpace($env:SMETA_AGENT_SWEEP_TOKEN)) {
    $headers["X-Smeta-Agent-Token"] = $env:SMETA_AGENT_SWEEP_TOKEN
  }

  $url = "$($ApiBase.TrimEnd('/'))/ai-agent-runs/control-sweep"
  $response = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType "application/json" -Body "{}" -TimeoutSec 60
  $summary = if ($response.run.summary) { $response.run.summary } else { "обход выполнен" }
  Add-Content -LiteralPath $logPath -Encoding UTF8 -Value "$stamp OK $summary"
} catch {
  Add-Content -LiteralPath $logPath -Encoding UTF8 -Value "$stamp ERROR $($_.Exception.Message)"
  exit 1
}
