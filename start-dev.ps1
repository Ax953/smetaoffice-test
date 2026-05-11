$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process -FilePath "npm.cmd" -ArgumentList "run", "server" -WorkingDirectory $Root -WindowStyle Hidden
Start-Sleep -Seconds 1
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "--port", "5173" -WorkingDirectory $Root -WindowStyle Hidden

Write-Host "SmetaOffice frontend: http://127.0.0.1:5173/"
Write-Host "SmetaOffice API:      http://127.0.0.1:8787/api/health"
