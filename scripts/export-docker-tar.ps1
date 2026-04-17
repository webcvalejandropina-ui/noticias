# Genera noticias-docker-images.tar con imagenes linux/amd64, portable a cualquier
# PC Linux x86_64 y Docker Desktop Windows/macOS (modo Linux containers).
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts/export-docker-tar.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$ApiImg = if ($env:NOTICIAS_API_IMAGE) { $env:NOTICIAS_API_IMAGE } else { "ai-news-api:latest" }
$FeImg  = if ($env:NOTICIAS_FRONTEND_IMAGE) { $env:NOTICIAS_FRONTEND_IMAGE } else { "ai-news-frontend:latest" }
$Platform = if ($env:NOTICIAS_BUILD_PLATFORM) { $env:NOTICIAS_BUILD_PLATFORM } else { "linux/amd64" }
$Out = Join-Path $Root "noticias-docker-images.tar"

docker buildx version 2>$null
if ($LASTEXITCODE -ne 0) { Write-Error "Necesitas Docker Buildx (Docker Desktop)." }
docker buildx inspect --bootstrap 2>$null | Out-Null

Write-Host "==> buildx $Platform  $ApiImg"
docker buildx build --platform $Platform --load -t $ApiImg -f Dockerfile .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> buildx $Platform  $FeImg"
docker buildx build --platform $Platform --load -t $FeImg -f frontend/Dockerfile frontend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> verificando arquitectura"
docker image inspect --format '{{.RepoTags}} {{.Os}}/{{.Architecture}}' $ApiImg $FeImg

Write-Host "==> docker save -> $Out"
docker save $ApiImg $FeImg -o $Out
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Get-Item $Out | Format-List Name, Length, LastWriteTime
Write-Host ""
Write-Host "En el equipo destino:"
Write-Host "  docker load -i noticias-docker-images.tar"
Write-Host "  docker compose up -d"
