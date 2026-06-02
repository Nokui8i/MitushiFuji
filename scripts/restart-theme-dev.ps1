# Clears local Shopify theme dev rate limits (429 / Cloudflare challenge).
# Run from project root: .\scripts\restart-theme-dev.ps1

Write-Host "Stopping theme dev on port 9292..." -ForegroundColor Yellow

Get-NetTCPConnection -LocalPort 9292 -ErrorAction SilentlyContinue |
  ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }

Get-Process -Name "node","ruby" -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -match "shopify" } |
  Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Wait 60-90 seconds for Cloudflare rate limit to reset." -ForegroundColor Cyan
Write-Host "If you see Cloudflare 'verify connection', run:" -ForegroundColor Red
Write-Host "  .\scripts\fix-cloudflare-block.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Then start dev with:" -ForegroundColor Green
Write-Host "  shopify theme dev -e default" -ForegroundColor White
Write-Host ""
Write-Host "Prefer this URL (works when localhost is blocked):" -ForegroundColor Green
Write-Host "  https://mitushii.myshopify.com/?preview_theme_id=191649022235" -ForegroundColor Cyan
Write-Host "Avoid gift card preview (CLI key g) and rapid cart clicking." -ForegroundColor DarkYellow
