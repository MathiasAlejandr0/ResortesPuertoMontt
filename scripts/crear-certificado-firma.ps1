# Crear certificado autofirmado para firma de código (gratuito, herramienta de Windows).
# Ejecutar una vez. Guarda el .pfx (para firmar) y el .cer (para instalar en el PC del cliente y que confíe).
# Ejecutar: powershell -ExecutionPolicy Bypass -File .\scripts\crear-certificado-firma.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$certsDir = Join-Path $projectRoot "release\certificado-firma"
$certName = "Resortes Puerto Montt"

if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
}

if (Test-Path $pfxPath) {
    $r = Read-Host "Ya existe un certificado en $certsDir . Crear uno nuevo sobrescribira el anterior. Continuar? (s/n)"
    if ($r -ne 's' -and $r -ne 'S') { exit 0 }
}

# Crear certificado autofirmado para firma de código (válido 3 años)
Write-Host "Creando certificado de firma de codigo (nombre: $certName)..."
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=$certName, O=Resortes Puerto Montt, L=Puerto Montt, C=CL" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(3) `
    -FriendlyName $certName

$thumbprint = $cert.Thumbprint
Write-Host "Certificado creado. Thumbprint: $thumbprint"

# Contraseña para el .pfx (cámbiala si quieres; necesitarás usarla al firmar)
$pfxPassword = Read-Host "Elige una contrasena para el archivo .pfx (la usaras al firmar)" -AsSecureString
$pfxPath = Join-Path $certsDir "ResortesPuertoMontt-firma.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pfxPassword | Out-Null
Write-Host "Certificado exportado a: $pfxPath"

# Exportar .cer (para instalar en el PC del cliente y que Windows confíe)
$cerPath = Join-Path $certsDir "ResortesPuertoMontt-firma.cer"
Export-Certificate -Cert $cert -FilePath $cerPath -Type CERT | Out-Null
Write-Host "Certificado publico (.cer) para el cliente: $cerPath"

Write-Host ""
Write-Host "Listo. Siguiente paso: ejecuta scripts\firmar-instalador.ps1 para firmar el .exe."
Write-Host "En el notebook del cliente: instala el archivo .cer (doble clic -> Instalar certificado -> Entidad emisora raiz de confianza)"
Write-Host "Guarda la contrasena del .pfx; la necesitaras cada vez que firmes una nueva version."
