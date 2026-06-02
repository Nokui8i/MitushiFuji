# Recover from Cloudflare "Your connection needs to be verified" on local theme dev.
# Run: .\scripts\fix-cloudflare-block.ps1

$PreviewUrl = "https://mitushii.myshopify.com/?preview_theme_id=191649022235"

Write-Host ""
Write-Host "=== Mitushi theme dev recovery ===" -ForegroundColor Cyan
Write-Host ""

# 1. Stop local dev servers
Write-Host "[1/4] Stopping local dev servers (9292, 9293)..." -ForegroundColor Yellow
9292, 9293 | ForEach-Object {
  Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "[2/4] CLEAR BROWSER DATA (required):" -ForegroundColor Red
Write-Host "  Chrome/Edge: paste in address bar:" -ForegroundColor White
Write-Host "    chrome://settings/siteData?q=127.0.0.1" -ForegroundColor Green
Write-Host "  Delete ALL site data for 127.0.0.1 AND localhost" -ForegroundColor White
Write-Host "  Close every tab pointing at 127.0.0.1:9292 or :9293" -ForegroundColor White
Write-Host ""

Write-Host "[3/4] Refresh Shopify CLI session:" -ForegroundColor Yellow
Write-Host "    shopify auth logout" -ForegroundColor Green
Write-Host "    shopify theme dev -e default   (opens browser to log in)" -ForegroundColor Green
Write-Host ""

Write-Host "[4/4] After login, start dev (less aggressive = fewer 429s):" -ForegroundColor Yellow
Write-Host "    shopify theme dev -e default" -ForegroundColor Green
Write-Host ""
Write-Host "  Browse the store HERE (avoids Cloudflare on localhost):" -ForegroundColor Cyan
Write-Host "    $PreviewUrl" -ForegroundColor Green
Write-Host ""
Write-Host "  Files still sync from this folder. Refresh the preview page after saves." -ForegroundColor DarkGray
Write-Host "  Do NOT press 'g' in the CLI (gift card preview triggers extra 429s)." -ForegroundColor DarkYellow
Write-Host "  Wait 2-3 minutes before retrying if you were rate-limited heavily." -ForegroundColor DarkGray
Write-Host ""

$open = Read-Host "Open preview URL in browser now? (y/n)"
if ($open -eq "y") {
  Start-Process $PreviewUrl
}
