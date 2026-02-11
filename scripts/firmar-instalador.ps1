# Firmar el instalador con el certificado creado por crear-certificado-firma.ps1
# Requiere: Windows SDK (SignTool). Si no lo tienes, instala "Herramientas de firma para Windows" desde Visual Studio Installer.
# Ejecutar: powershell -ExecutionPolicy Bypass -File .\scripts\firmar-instalador.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$setupExe = Join-Path $projectRoot "release\Resortes Puerto Montt-Setup.exe"
$certsDir = Join-Path $projectRoot "release\certificado-firma"
$pfxPath = Join-Path $certsDir "ResortesPuertoMontt-firma.pfx"

if (-not (Test-Path $setupExe)) {
    Write-Error "No se encuentra el instalador: $setupExe . Genera primero el instalador (npm run dist o dist:installer)."
}

if (-not (Test-Path $pfxPath)) {
    Write-Error "No se encuentra el certificado: $pfxPath . Ejecuta primero scripts\crear-certificado-firma.ps1"
}

# Buscar SignTool (Windows SDK)
$kitsPath = "${env:ProgramFiles(x86)}\Windows Kits\10\bin"
$signtool = $null
if (Test-Path $kitsPath) {
    $signtool = Get-ChildItem -Path $kitsPath -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "x64\\signtool\.exe$" } |
        Sort-Object { $_.Directory.Parent.Name } -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $signtool) {
    Write-Host "SignTool no encontrado en: $kitsPath"
    Write-Host "Instala el Windows SDK o 'Signing Tools for Windows' desde:"
    Write-Host "  https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/"
    Write-Host "  O en Visual Studio Installer: Modificar -> Desarrollo para el escritorio -> Herramientas de firma para Windows"
    exit 1
}

$password = Read-Host "Contrasena del archivo .pfx" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host "Firmando: $setupExe"
& $signtool sign `
    /f $pfxPath `
    /p $passwordPlain `
    /tr "http://timestamp.digicert.com" `
    /td sha256 `
    /fd sha256 `
    /d "Resortes Puerto Montt - Gestion de taller" `
    $setupExe

if ($LASTEXITCODE -ne 0) {
    Write-Error "La firma fallo. Revisa la contrasena del .pfx y que el certificado sea de tipo Firma de codigo."
}

Write-Host "Instalador firmado correctamente: $setupExe"
Write-Host "En el PC del cliente: instala release\certificado-firma\ResortesPuertoMontt-firma.cer como 'Entidad emisora raiz de confianza' para que Windows no muestre advertencia."
