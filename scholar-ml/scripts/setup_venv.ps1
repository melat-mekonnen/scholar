<#
.SYNOPSIS
  Create scholar-ml .venv and install requirements (avoids activation issues on Windows).

.USAGE
  From scholar-ml root:
    powershell -ExecutionPolicy Bypass -File .\scripts\setup_venv.ps1
  Recreate venv from scratch:
    powershell -ExecutionPolicy Bypass -File .\scripts\setup_venv.ps1 -Recreate
#>
param(
  [switch]$Recreate
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
$VenvDir = Join-Path $Root ".venv"

function Test-VenvOk {
  if (-not (Test-Path $VenvPython)) { return $false }
  try {
    & $VenvPython -c "import sys; print(sys.executable)" 2>$null | Out-Null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

if ($Recreate -or (-not (Test-VenvOk))) {
  if (Test-Path $VenvDir) {
    Write-Host "Removing existing .venv ..."
    # Retry: Windows sometimes locks python.exe briefly
    for ($i = 0; $i -lt 5; $i++) {
      try {
        Remove-Item -Recurse -Force $VenvDir -ErrorAction Stop
        break
      } catch {
        Write-Warning "Could not remove .venv (attempt $($i+1)/5). Close other terminals and stop pip. Retrying in 2s..."
        Start-Sleep -Seconds 2
      }
    }
    if (Test-Path $VenvDir) {
      Write-Error "Still cannot delete .venv. Close Cursor terminals using scholar-ml, Task Manager > end stray python.exe, then run again with -Recreate."
      exit 1
    }
  }

  Write-Host "Creating virtual environment in $VenvDir ..."
  $py = Get-Command python -ErrorAction SilentlyContinue
  if (-not $py) {
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
      py -3 -m venv .venv
    } else {
      Write-Error "Neither 'python' nor 'py' found on PATH. Install Python 3.10+ from python.org and try again."
      exit 1
    }
  } else {
    python -m venv .venv
  }

  if (-not (Test-Path $VenvPython)) {
    Write-Error "venv creation failed: missing $VenvPython"
    exit 1
  }
}

Write-Host "Upgrading pip ..."
& $VenvPython -m pip install --upgrade pip

Write-Host "Installing requirements (this may take several minutes) ..."
& $VenvPython -m pip install -r (Join-Path $Root "requirements.txt")

Write-Host "Smoke test ..."
& $VenvPython -c "from src.config import EMBEDDING_MODEL; print('OK:', EMBEDDING_MODEL)"

Write-Host ""
Write-Host "Done. Use this Python (no activation required):"
Write-Host "  $VenvPython -m pip <command>"
Write-Host "  $VenvPython -m scripts.export_scholarships   # after M1"
