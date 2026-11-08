# Khởi động toàn stack dev: PostgreSQL + FastAPI backend + Nuxt dev server.
# Chạy từ thư mục gốc dự án Nuxt:
#   powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1
#
# Giả định backend clone ở C:\Users\phamn\Downloads\tthc-tra-cuu-main.
# Đổi biến $Backend bên dưới nếu khác.

$ErrorActionPreference = "Stop"
$Backend = "C:\Users\phamn\Downloads\tthc-tra-cuu-main"
$PgPort = 55432
$BackendPort = 8800

function Test-PortOpen($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ReceiveTimeout = 500
        $tcp.SendTimeout = 500
        $r = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $ok = $r.AsyncWaitHandle.WaitOne(500, $false)
        if ($ok) { $tcp.EndConnect($r); return $true }
        return $false
    } catch { return $false } finally { if ($tcp) { $tcp.Close() } }
}

Write-Host ""
Write-Host "=== Nuxt Admin TTHC Dev Starter ===" -ForegroundColor Cyan
Write-Host ""

# 1. PostgreSQL
if (Test-PortOpen $PgPort) {
    Write-Host "[1/3] PostgreSQL cluster đã chạy ở :$PgPort" -ForegroundColor Green
} else {
    Write-Host "[1/3] Khởi động PostgreSQL cluster..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File "$Backend\scripts\pg_dev.ps1" start
    Start-Sleep -Seconds 2
    if (-not (Test-PortOpen $PgPort)) {
        Write-Host "✗ Không khởi động được PG. Kiểm tra $Backend\local-data\pg\logfile" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ PostgreSQL ready" -ForegroundColor Green
}

# 2. FastAPI backend — mở tab Windows Terminal mới
if (Test-PortOpen $BackendPort) {
    Write-Host "[2/3] FastAPI backend đã chạy ở :$BackendPort" -ForegroundColor Green
} else {
    Write-Host "[2/3] Khởi động FastAPI backend ở tab Windows Terminal mới..." -ForegroundColor Yellow
    $wtAvailable = Get-Command wt.exe -ErrorAction SilentlyContinue
    if ($wtAvailable) {
        wt -w 0 new-tab --title "FastAPI :$BackendPort" -d "$Backend" pwsh -NoExit -Command "python -m uvicorn app.main:create_app --factory --app-dir backend --host 127.0.0.1 --port $BackendPort"
    } else {
        # Fallback: Start-Process mở cửa sổ pwsh mới
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$Backend'; python -m uvicorn app.main:create_app --factory --app-dir backend --host 127.0.0.1 --port $BackendPort"
    }

    Write-Host "   Chờ backend sẵn sàng..." -ForegroundColor Gray
    $tries = 0
    while (-not (Test-PortOpen $BackendPort) -and $tries -lt 30) {
        Start-Sleep -Seconds 1
        $tries++
    }
    if (Test-PortOpen $BackendPort) {
        Write-Host "✓ FastAPI ready ở http://127.0.0.1:$BackendPort" -ForegroundColor Green
    } else {
        Write-Host "⚠ Backend chưa thấy sau 30s — có thể đang khởi động. Vẫn tiếp tục Nuxt." -ForegroundColor Yellow
    }
}

# 3. Nuxt dev (foreground ở terminal hiện tại)
Write-Host ""
Write-Host "[3/3] Khởi động Nuxt dev server (giữ terminal này mở)..." -ForegroundColor Yellow
Write-Host "      → http://localhost:3000/admin/login" -ForegroundColor Cyan
Write-Host ""

# Chuyển sang Node 20 qua fnm nếu có
$fnm = Get-Command fnm -ErrorAction SilentlyContinue
if ($fnm) {
    & fnm use 20 2>$null
}

npm run dev
