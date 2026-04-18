# Deploys a previously generated noticias-deploy bundle on Windows PowerShell.

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path "noticias-docker-images.tar")) {
  throw "noticias-docker-images.tar no existe en este directorio. Si estas en Portainer, importa los dos archivos noticias-*-image.tar y crea un Stack."
}

if (-not (Test-Path "docker-compose.yml")) {
  throw "docker-compose.yml no existe en este directorio."
}

if ((-not (Test-Path ".env")) -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env"
  Write-Host "==> creado .env desde .env.example"
  Write-Host "    Si accedes desde otra maquina de la LAN, edita PUBLIC_API_URL en .env."
}

Write-Host "==> cargando imagenes Docker"
docker load -i noticias-docker-images.tar
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> levantando stack"
docker compose up -d --remove-orphans
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> estado"
docker compose ps

Write-Host ""
Write-Host "Listo:"
Write-Host "  Frontend: http://localhost:4321"
Write-Host "  API:      http://localhost:13100"
