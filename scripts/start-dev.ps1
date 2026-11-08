# Start the full dev stack: PostgreSQL + FastAPI backend + Nuxt dev server.
# Usage from Nuxt project root:
#   powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1
#
# Assumes the backend repo is cloned to C:\Users\phamn\Downloads\tthc-tra-cuu-main.
# Change $Backend below if different.

$ErrorActionPreference = "Stop"
$Backend = "C:\Users\phamn\Downloads\tthc-tra-cuu-main"
$PgPort = 55432
$BackendPort = 8800

function Test-PortOpen($port) {
    $tcp = $null
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ReceiveTimeout = 500
        $tcp.SendTimeout = 500
        $r = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $ok = $r.AsyncWaitHandle.WaitOne(500, $false)
        if ($ok) {
            $tcp.EndConnect($r)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        if ($null -ne $tcp) {
            $tcp.Close()
        }
    }
}

Write-Host ""
Write-Host "=== Nuxt Admin TTHC Dev Starter ===" -ForegroundColor Cyan
Write-Host ""

# 1. PostgreSQL
if (Test-PortOpen $PgPort) {
    Write-Host "[1/3] PostgreSQL cluster already running on :$PgPort" -ForegroundColor Green
} else {
    Write-Host "[1/3] Starting PostgreSQL cluster..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File "$Backend\scripts\pg_dev.ps1" start
    Start-Sleep -Seconds 2
    if (-not (Test-PortOpen $PgPort)) {
        Write-Host "FAIL: Could not start PG. Check $Backend\local-data\pg\logfile" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: PostgreSQL ready" -ForegroundColor Green
}

# 2. FastAPI backend in a new Windows Terminal tab
if (Test-PortOpen $BackendPort) {
    Write-Host "[2/3] FastAPI backend already running on :$BackendPort" -ForegroundColor Green
} else {
    Write-Host "[2/3] Starting FastAPI backend in a new terminal..." -ForegroundColor Yellow
    # Pick available shell: prefer pwsh (PS7), fallback to powershell (5.1)
    $shell = if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }
    $uvicornCmd = "python -m uvicorn app.main:create_app --factory --app-dir backend --host 127.0.0.1 --port $BackendPort"

    $wtAvailable = Get-Command wt.exe -ErrorAction SilentlyContinue
    if ($wtAvailable) {
        wt -w 0 new-tab --title "FastAPI :$BackendPort" -d "$Backend" $shell -NoExit -Command $uvicornCmd
    } else {
        Start-Process $shell -ArgumentList "-NoExit", "-Command", "cd '$Backend'; $uvicornCmd"
    }

    Write-Host "   Waiting for backend to be ready..." -ForegroundColor Gray
    $tries = 0
    while (-not (Test-PortOpen $BackendPort) -and $tries -lt 30) {
        Start-Sleep -Seconds 1
        $tries++
    }
    if (Test-PortOpen $BackendPort) {
        Write-Host "OK: FastAPI ready at http://127.0.0.1:$BackendPort" -ForegroundColor Green
    } else {
        Write-Host "WARN: Backend not detected after 30s. Starting Nuxt anyway." -ForegroundColor Yellow
    }
}

# 3. Nuxt dev (foreground in current terminal)
Write-Host ""
Write-Host "[3/3] Starting Nuxt dev server (keep this terminal open)..." -ForegroundColor Yellow
Write-Host "      -> http://localhost:3000/admin/login" -ForegroundColor Cyan
Write-Host ""

# Switch to Node 20 via fnm if available
$fnm = Get-Command fnm -ErrorAction SilentlyContinue
if ($fnm) {
    & fnm use 20 2>$null
}

npm run dev
