# Genera el instalador NSIS desde C:\resortes_build (ruta corta sin OneDrive)
# para evitar el error "spawn UNKNOWN" de electron-builder.
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$buildDir = "C:\resortes_build"

Write-Host "Sincronizando proyecto a $buildDir ..."
& robocopy $projectRoot $buildDir /E /XD node_modules release .git /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Robocopy fallo" }

# Usar NSIS en la copia (en el proyecto puede estar portable)
$pkgPath = Join-Path $buildDir "package.json"
(Get-Content $pkgPath -Raw) -replace '"target": "portable"', '"target": "nsis"' | Set-Content $pkgPath -NoNewline

Push-Location $buildDir
try {
    Write-Host "Instalando dependencias..."
    cmd /c "npm install"
    if ($LASTEXITCODE -ne 0) { throw "npm install fallo" }
    Write-Host "Compilando..."
    cmd /c "npm run build"
    if ($LASTEXITCODE -ne 0) { throw "npm run build fallo" }
    Write-Host "Generando instalador NSIS..."
    cmd /c "npx electron-builder --win nsis"
    if ($LASTEXITCODE -ne 0) { throw "electron-builder fallo" }
    $setup = Join-Path $buildDir "release\Resortes Puerto Montt-Setup.exe"
    if (-not (Test-Path $setup)) { throw "No se genero el instalador" }
    Write-Host "Copiando instalador al proyecto..."
    Copy-Item $setup (Join-Path $projectRoot "release\Resortes Puerto Montt-Setup.exe") -Force
    $blockmap = Join-Path $buildDir "release\Resortes Puerto Montt-Setup.exe.blockmap"
    if (Test-Path $blockmap) { Copy-Item $blockmap (Join-Path $projectRoot "release\") -Force }
    Write-Host "Listo. Instalador en: release\Resortes Puerto Montt-Setup.exe"
} finally {
    Pop-Location
}
