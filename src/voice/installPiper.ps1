# ============================================================================
# GankMeDaddy — Piper TTS Offline Engine Installer
# Downloads and configures the Piper executable and Jenny British female voice
# ============================================================================

$ProgressPreference = 'SilentlyContinue' # Speeds up downloads by hiding the progress bar

$binDir = "d:\GankMeDaddy\bin"
$piperDir = Join-Path $binDir "piper"

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir | Out-Null
}
if (-not (Test-Path $piperDir)) {
    New-Item -ItemType Directory -Path $piperDir | Out-Null
}

$zipUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
$onnxUrl = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx?download=true"
$jsonUrl = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx.json?download=true"

$zipPath = Join-Path $piperDir "piper.zip"
$onnxPath = Join-Path $piperDir "en_GB-jenny_dioco-medium.onnx"
$jsonPath = Join-Path $piperDir "en_GB-jenny_dioco-medium.onnx.json"

Write-Host "═══════════════════════════════════════════"
Write-Host "Installing Piper TTS Engine (UK Female Sonia/Jenny)"
Write-Host "═══════════════════════════════════════════"

try {
    # 1. Download Piper zip
    if (-not (Test-Path (Join-Path $piperDir "piper.exe"))) {
        Write-Host "[PIPER] Downloading Piper engine (~12MB)..."
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -TimeoutSec 300
        
        Write-Host "[PIPER] Extracting engine..."
        # Extract to a temp directory because Expand-Archive creates a nested folder
        $tempExtract = Join-Path $piperDir "temp_extract"
        Expand-Archive -Path $zipPath -DestinationPath $tempExtract -Force
        
        # Move all contents from temp_extract/piper/ to piperDir
        $nestedDir = Join-Path $tempExtract "piper"
        if (Test-Path $nestedDir) {
            Get-ChildItem -Path $nestedDir | Move-Item -Destination $piperDir -Force
        } else {
            Get-ChildItem -Path $tempExtract | Move-Item -Destination $piperDir -Force
        }
        
        # Cleanup
        Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "[PIPER] Piper engine already exists."
    }

    # 2. Download ONNX model file
    if (-not (Test-Path $onnxPath)) {
        Write-Host "[PIPER] Downloading Jenny-Dioco ONNX voice model (~15MB)..."
        Invoke-WebRequest -Uri $onnxUrl -OutFile $onnxPath -TimeoutSec 300
    } else {
        Write-Host "[PIPER] Jenny-Dioco ONNX model already exists."
    }

    # 3. Download JSON config file
    if (-not (Test-Path $jsonPath)) {
        Write-Host "[PIPER] Downloading model configuration..."
        Invoke-WebRequest -Uri $jsonUrl -OutFile $jsonPath -TimeoutSec 300
    } else {
        Write-Host "[PIPER] Model configuration already exists."
    }

    Write-Host "═══════════════════════════════════════════"
    Write-Host "[SUCCESS] Piper TTS installed and configured offline!"
    Write-Host "═══════════════════════════════════════════"
} catch {
    Write-Error "[ERROR] Failed to install Piper TTS: $_"
    exit 1
}
